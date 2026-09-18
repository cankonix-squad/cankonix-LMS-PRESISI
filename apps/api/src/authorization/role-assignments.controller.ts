import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  RequirePermissions,
  RequireSelfOrPermission,
} from './authorization.decorators';
import {
  AddScopesDto,
  CreateUserRoleAssignmentDto,
  EvaluatePermissionQueryDto,
  ListUserRoleAssignmentsQueryDto,
  UpdateUserRoleAssignmentStatusDto,
} from './dto/role-assignment-request.dto';
import {
  PermissionEvaluationResultDto,
  UserEffectivePermissionsResponseDto,
  UserRoleAssignmentListResponseDto,
  UserRoleAssignmentResponseDto,
} from './dto/role-assignment-response.dto';
import { RoleAssignmentsService } from './role-assignments.service';

/**
 * Role assignment and scope binding endpoints.
 *
 * Every route declares an explicit Permission + Scope policy; the fail-closed
 * global `PermissionGuard` rejects anything that does not. Subject-scoped reads
 * use `@RequireSelfOrPermission` so a caller can inspect only their own
 * authorization state unless they hold the administrative permission.
 */
@ApiTags('authorization')
@ApiForbiddenResponse({
  description: 'Authenticated caller without the required permission.',
})
@Controller('authorization')
export class RoleAssignmentsController {
  constructor(
    private readonly roleAssignmentsService: RoleAssignmentsService,
  ) {}

  @Post('assignments')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ASSIGNMENT_MANAGE)
  @ApiCreatedResponse({ type: UserRoleAssignmentResponseDto })
  createAssignment(
    @Body() dto: CreateUserRoleAssignmentDto,
  ): Promise<UserRoleAssignmentResponseDto> {
    return this.roleAssignmentsService.createAssignment(dto);
  }

  @Get('assignments')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ASSIGNMENT_READ)
  @ApiOkResponse({ type: UserRoleAssignmentListResponseDto })
  listAssignments(
    @Query() query: ListUserRoleAssignmentsQueryDto,
  ): Promise<UserRoleAssignmentListResponseDto> {
    return this.roleAssignmentsService.listAssignments(query);
  }

  @Get('assignments/:id')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ASSIGNMENT_READ)
  @ApiOkResponse({ type: UserRoleAssignmentResponseDto })
  findAssignment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserRoleAssignmentResponseDto> {
    return this.roleAssignmentsService.findAssignment(id);
  }

  @Patch('assignments/:id/status')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ASSIGNMENT_MANAGE)
  @ApiOkResponse({ type: UserRoleAssignmentResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleAssignmentStatusDto,
  ): Promise<UserRoleAssignmentResponseDto> {
    return this.roleAssignmentsService.updateStatus(id, dto);
  }

  @Delete('assignments/:id')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ASSIGNMENT_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteAssignment(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.roleAssignmentsService.deleteAssignment(id);
  }

  @Post('assignments/:id/scopes')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ASSIGNMENT_MANAGE)
  @ApiCreatedResponse({ type: UserRoleAssignmentResponseDto })
  addScopes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddScopesDto,
  ): Promise<UserRoleAssignmentResponseDto> {
    return this.roleAssignmentsService.addScopes(id, dto);
  }

  @Delete('assignments/:id/scopes/:scopeId')
  @RequirePermissions(AUTHORIZATION_PERMISSIONS.ASSIGNMENT_MANAGE)
  @ApiOkResponse({ type: UserRoleAssignmentResponseDto })
  removeScope(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('scopeId', ParseUUIDPipe) scopeId: string,
  ): Promise<UserRoleAssignmentResponseDto> {
    return this.roleAssignmentsService.removeScope(id, scopeId);
  }

  @Get('users/:userAccountId/effective-permissions')
  @RequireSelfOrPermission({
    subjectParam: 'userAccountId',
    permission: AUTHORIZATION_PERMISSIONS.EFFECTIVE_PERMISSION_READ,
  })
  @ApiOkResponse({ type: UserEffectivePermissionsResponseDto })
  getUserEffectivePermissions(
    @Param('userAccountId', ParseUUIDPipe) userAccountId: string,
  ): Promise<UserEffectivePermissionsResponseDto> {
    return this.roleAssignmentsService.getUserEffectivePermissions(
      userAccountId,
    );
  }

  @Get('users/:userAccountId/has-permission/:permissionCode')
  @RequireSelfOrPermission({
    subjectParam: 'userAccountId',
    permission: AUTHORIZATION_PERMISSIONS.EFFECTIVE_PERMISSION_READ,
  })
  @ApiOkResponse({ type: PermissionEvaluationResultDto })
  async evaluatePermission(
    @Param('userAccountId', ParseUUIDPipe) userAccountId: string,
    @Param('permissionCode') permissionCode: string,
    @Query() query: EvaluatePermissionQueryDto,
  ): Promise<PermissionEvaluationResultDto> {
    const allowed = await this.roleAssignmentsService.hasPermission(
      userAccountId,
      permissionCode,
      query.scopeType,
      query.scopeId,
    );
    return {
      allowed,
      reason: allowed ? undefined : 'Permission not granted for target scope',
    };
  }
}
