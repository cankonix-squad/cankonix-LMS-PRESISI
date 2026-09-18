import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AllowAuthenticated } from '../authorization/authorization.decorators';
import { CreateUserAccountDto } from './dto/create-user-account.dto';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
import { UserAccountResponseDto } from './dto/user-account-response.dto';
import { UserAccountsService } from './user-accounts.service';

/**
 * User account records (TASK-002 foundation).
 *
 * Explicitly allow-listed for authenticated callers: the fail-closed
 * `PermissionGuard` needs an auditable decision per route, and this module's
 * permission vocabulary is owned by the task that owns the module. Replace this
 * allow-list with `@RequirePermissions(...)` before production readiness.
 */
@ApiTags('user-accounts')
@AllowAuthenticated()
@Controller('persons/:personId/account')
export class UserAccountsController {
  constructor(private readonly accounts: UserAccountsService) {}

  @Post()
  @ApiCreatedResponse({ type: UserAccountResponseDto })
  create(
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: CreateUserAccountDto,
  ): Promise<UserAccountResponseDto> {
    return this.accounts.create(personId, dto);
  }

  @Get()
  @ApiOkResponse({ type: UserAccountResponseDto })
  findByPerson(
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<UserAccountResponseDto> {
    return this.accounts.findByPerson(personId);
  }

  @Patch()
  @ApiOkResponse({ type: UserAccountResponseDto })
  update(
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: UpdateUserAccountDto,
  ): Promise<UserAccountResponseDto> {
    return this.accounts.update(personId, dto);
  }
}
