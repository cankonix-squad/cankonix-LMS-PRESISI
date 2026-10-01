import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { USER_ACCOUNT_PERMISSIONS } from '../user-accounts/user-account-permissions';
import {
  KeycloakProvisioningOperationResponseDto,
  KeycloakProvisioningStatusResponseDto,
} from './dto/keycloak-provisioning-response.dto';
import { SetKeycloakPasswordDto } from './dto/set-keycloak-password.dto';
import { SetKeycloakUserStatusDto } from './dto/set-keycloak-user-status.dto';
import { KeycloakProvisioningService } from './keycloak-provisioning.service';

/**
 * Keycloak user provisioning (Admin portal).
 *
 * Identity is created here; authorization is not. Roles, permissions and scopes
 * remain an LMS concern (Permission + Scope), so nothing in this controller ever
 * writes a Keycloak role. Every route is gated by the real permission boundary,
 * and none of them returns or accepts a stored credential.
 */
@ApiTags('keycloak-provisioning')
@Controller('persons/:personId/keycloak')
export class KeycloakProvisioningController {
  constructor(private readonly provisioning: KeycloakProvisioningService) {}

  @Get('status')
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Provisioning status for a person account' })
  @ApiOkResponse({ type: KeycloakProvisioningStatusResponseDto })
  getStatus(
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<KeycloakProvisioningStatusResponseDto> {
    return this.provisioning.getStatus(personId);
  }

  @Post('provision')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.MANAGE)
  @ApiOperation({ summary: 'Create or adopt a Keycloak user for the account' })
  @ApiOkResponse({ type: KeycloakProvisioningOperationResponseDto })
  provision(
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    return this.provisioning.provision(personId);
  }

  @Post('link-existing')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.MANAGE)
  @ApiOperation({
    summary: 'Link an existing same-username Keycloak user (no duplicate)',
  })
  @ApiOkResponse({ type: KeycloakProvisioningOperationResponseDto })
  linkExisting(
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    return this.provisioning.linkExisting(personId);
  }

  @Put('password')
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.MANAGE)
  @ApiOperation({ summary: 'Set or reset the Keycloak password' })
  @ApiOkResponse({ type: KeycloakProvisioningOperationResponseDto })
  setPassword(
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: SetKeycloakPasswordDto,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    return this.provisioning.setPassword(personId, dto);
  }

  @Post('activation')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.MANAGE)
  @ApiOperation({ summary: 'Report the Keycloak activation state' })
  @ApiOkResponse({ type: KeycloakProvisioningOperationResponseDto })
  requestActivation(
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    return this.provisioning.requestActivation(personId);
  }

  @Put('status')
  @RequirePermissions(USER_ACCOUNT_PERMISSIONS.MANAGE)
  @ApiOperation({ summary: 'Enable or disable the Keycloak login' })
  @ApiOkResponse({ type: KeycloakProvisioningOperationResponseDto })
  setUserStatus(
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: SetKeycloakUserStatusDto,
  ): Promise<KeycloakProvisioningOperationResponseDto> {
    return this.provisioning.setUserStatus(personId, dto);
  }
}
