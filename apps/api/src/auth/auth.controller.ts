import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowAuthenticated } from '../authorization/authorization.decorators';
import { CurrentUser } from './auth.decorators';
import { AuthenticatedPrincipal } from './auth.types';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';

/**
 * The guard is applied globally, so no `@UseGuards` is needed here. Adding it
 * would run authentication twice for the same request.
 *
 * `@AllowAuthenticated` is the explicit, reviewed allow-list entry: this route
 * returns the caller's own identity and deliberately exposes no roles and no
 * permissions, so it holds no Permission + Scope boundary. Authorization state
 * is served by `/authorization/users/{id}/effective-permissions` instead.
 */
@ApiTags('auth')
@ApiBearerAuth()
@ApiForbiddenResponse({
  description:
    'Route is not allow-listed for authentication-only access. Should not occur for this endpoint.',
})
@Controller('me')
export class AuthController {
  @Get()
  @AllowAuthenticated()
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, expired or unmapped access token.',
  })
  me(@CurrentUser() principal: AuthenticatedPrincipal): CurrentUserResponseDto {
    return {
      accountId: principal.accountId,
      personId: principal.personId,
      personnelNumber: principal.personnelNumber,
      fullName: principal.fullName,
      username: principal.username,
      email: principal.email,
      accountStatus: principal.accountStatus,
    };
  }
}
