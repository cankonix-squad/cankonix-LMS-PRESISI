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
import { RequirePermissions } from '../authorization/authorization.decorators';
import { CreateUserAccountDto } from './dto/create-user-account.dto';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
import { UserAccountResponseDto } from './dto/user-account-response.dto';
import { USER_ACCOUNT_PERMISSIONS } from './user-account-permissions';
import { UserAccountsService } from './user-accounts.service';

/**
 * User account records (TASK-002 foundation).
 *
 * The boundary is a real permission: `user_account.read` for reads and
 * `user_account.manage` for lifecycle writes. Creating an account is a sensitive
 * identity operation, so "any authenticated caller" is not enough — the
 * foundation allow-list was replaced once this module's permission catalogue
 * existed.
 *
 * Keycloak identity provisioning lives in a separate controller
 * (`persons/:personId/keycloak`) so the account contract stays free of provider
 * details.
 */
@ApiTags('user-accounts')
@Controller('persons/:personId/account')
export class UserAccountsController {
  constructor(private readonly accounts: UserAccountsService) {}

  @Post()
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.MANAGE)
  @ApiCreatedResponse({ type: UserAccountResponseDto })
  create(
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: CreateUserAccountDto,
  ): Promise<UserAccountResponseDto> {
    return this.accounts.create(personId, dto);
  }

  @Get()
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.READ)
  @ApiOkResponse({ type: UserAccountResponseDto })
  findByPerson(
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<UserAccountResponseDto> {
    return this.accounts.findByPerson(personId);
  }

  @Patch()
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.MANAGE)
  @ApiOkResponse({ type: UserAccountResponseDto })
  update(
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: UpdateUserAccountDto,
  ): Promise<UserAccountResponseDto> {
    return this.accounts.update(personId, dto);
  }
}
