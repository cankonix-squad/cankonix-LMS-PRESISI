import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AUTHORIZATION_PERMISSIONS } from './authorization-permissions';
import { AuthorizationService } from './authorization.service';
import { RequirePermissions } from './authorization.decorators';
import {
  CreatePermissionDto,
  CreateRoleDto,
  ListPermissionsQueryDto,
  ListRolesQueryDto,
  UpdateRoleDto,
} from './dto/authorization-request.dto';
import {
  PermissionListResponseDto,
  PermissionResponseDto,
  PermissionSeedResponseDto,
  RoleDetailResponseDto,
  RoleListResponseDto,
  RolePermissionResponseDto,
} from './dto/authorization-response.dto';

/**
 * RBAC catalogue endpoints.
 *
 * `AuthorizationService` is the application service here; roles and permissions
 * are this module's own state, so the controller talks to a service rather than
 * reaching into persistence.
 *
 * Every route declares an explicit permission policy. The RBAC catalogue is the
 * most sensitive surface in the API, so it never relies on authentication alone
 * and is never left to the fail-closed default.
 */
@ApiTags('authorization')
@ApiForbiddenResponse({
  description: 'Authenticated caller without the required permission.',
})
@Controller('authorization')
export class AuthorizationController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Post('roles')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ROLE_MANAGE)
  @ApiCreatedResponse({ type: RoleDetailResponseDto })
  createRole(@Body() dto: CreateRoleDto): Promise<RoleDetailResponseDto> {
    return this.authorization.createRole(dto);
  }

  @Get('roles')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ROLE_READ)
  @ApiOkResponse({ type: RoleListResponseDto })
  listRoles(@Query() query: ListRolesQueryDto): Promise<RoleListResponseDto> {
    return this.authorization.listRoles(query);
  }

  @Get('roles/:id')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ROLE_READ)
  @ApiOkResponse({ type: RoleDetailResponseDto })
  findRole(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoleDetailResponseDto> {
    return this.authorization.findRole(id);
  }

  @Post('roles/:id')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ROLE_MANAGE)
  @ApiOkResponse({ type: RoleDetailResponseDto })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDetailResponseDto> {
    return this.authorization.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ROLE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteRole(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.authorization.deleteRole(id);
  }

  @Get('roles/:id/permissions')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ROLE_READ)
  @ApiOkResponse({ type: [PermissionResponseDto] })
  listRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PermissionResponseDto[]> {
    return this.authorization.listRolePermissions(id);
  }

  @Post('roles/:roleId/permissions/:permissionId')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ROLE_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RolePermissionResponseDto })
  grantPermission(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ): Promise<RolePermissionResponseDto> {
    return this.authorization.grantPermission(roleId, permissionId);
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ROLE_MANAGE)
  @ApiOkResponse({ type: RolePermissionResponseDto })
  revokePermission(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ): Promise<RolePermissionResponseDto> {
    return this.authorization.revokePermission(roleId, permissionId);
  }

  @Get('permissions')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.PERMISSION_READ)
  @ApiOkResponse({ type: PermissionListResponseDto })
  listPermissions(
    @Query() query: ListPermissionsQueryDto,
  ): Promise<PermissionListResponseDto> {
    return this.authorization.listPermissions(query);
  }

  @Post('permissions/seed')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.PERMISSION_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PermissionSeedResponseDto })
  seedPermission(
    @Body() dto: CreatePermissionDto,
  ): Promise<PermissionSeedResponseDto> {
    return this.authorization.seedPermission(dto);
  }

  @Post('permissions')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.PERMISSION_MANAGE)
  @ApiCreatedResponse({ type: PermissionResponseDto })
  createPermission(
    @Body() dto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.authorization.createPermission(dto);
  }
}
