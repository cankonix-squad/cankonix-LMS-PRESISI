import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { ListUserAccountsQueryDto } from './dto/list-user-accounts-query.dto';
import { UserAccountListResponseDto } from './dto/user-account-with-person-response.dto';
import { USER_ACCOUNT_PERMISSIONS } from './user-account-permissions';
import { UserAccountsService } from './user-accounts.service';

/**
 * Account directory (Data Individu vs Akun Pengguna separation).
 *
 * Deliberately a separate controller from `persons/:personId/account`: the
 * person-scoped controller answers "does *this* person have an account", while
 * this one answers "which accounts exist". Keeping them apart is what lets the
 * Data Individu menu exist without implying every person has an account.
 *
 * The boundary is the existing `user_account.read` permission — separating the
 * menu never widens access, and a caller that could not read a single account
 * still cannot read the directory.
 */
@ApiTags('user-accounts')
@Controller('user-accounts')
export class UserAccountDirectoryController {
  constructor(private readonly accounts: UserAccountsService) {}

  @Get()
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.READ)
  @ApiOkResponse({ type: UserAccountListResponseDto })
  list(
    @Query() query: ListUserAccountsQueryDto,
  ): Promise<UserAccountListResponseDto> {
    return this.accounts.list(query);
  }
}
