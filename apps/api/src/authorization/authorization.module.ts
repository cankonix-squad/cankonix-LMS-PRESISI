import { DynamicModule, Module, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { AuthorizationController } from './authorization.controller';
import {
  AUTHORIZATION_REPOSITORY,
  PrismaAuthorizationRepository,
} from './authorization.repository';
import { AuthorizationService } from './authorization.service';
import {
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
} from './permission-evaluator';
import { PermissionGuard } from './permission.guard';
import { RoleAssignmentsController } from './role-assignments.controller';
import {
  PrismaRoleAssignmentsRepository,
  ROLE_ASSIGNMENTS_REPOSITORY,
} from './role-assignments.repository';
import { RoleAssignmentsService } from './role-assignments.service';

export type AuthorizationModuleOptions = {
  /**
   * Composition seam for HTTP tests. Defaults to `RoleAssignmentsService`,
   * which resolves permissions from persisted role assignments.
   *
   * Substituting an evaluator can only answer permission questions — it cannot
   * make `PermissionGuard` skip its checks.
   */
  permissionEvaluator?: PermissionEvaluator;
};

/**
 * Authorization module (RBAC catalogue + Role Assignment + Scope evaluation).
 *
 * `PermissionGuard` is registered as a global `APP_GUARD` here, after the
 * bearer-token guard in `AuthModule`, so every controller is protected by
 * Permission + Scope by default. A controller without an explicit policy
 * (`@RequirePermissions`, `@RequireScope`, `@RequireSelfOrPermission`,
 * `@AllowAuthenticated`, or `@Public`) is denied.
 */
@Module({})
export class AuthorizationModule {
  static register(options: AuthorizationModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      AuthorizationService,
      RoleAssignmentsService,
      PermissionGuard,
      {
        provide: AUTHORIZATION_REPOSITORY,
        useClass: PrismaAuthorizationRepository,
      },
      {
        provide: ROLE_ASSIGNMENTS_REPOSITORY,
        useClass: PrismaRoleAssignmentsRepository,
      },
      options.permissionEvaluator
        ? {
            provide: PERMISSION_EVALUATOR,
            useValue: options.permissionEvaluator,
          }
        : {
            provide: PERMISSION_EVALUATOR,
            useExisting: RoleAssignmentsService,
          },
      // Registered globally, after the bearer-token guard, so Permission +
      // Scope is enforced on every route by default (fail closed).
      { provide: APP_GUARD, useExisting: PermissionGuard },
    ];

    return {
      module: AuthorizationModule,
      imports: [
        PrismaModule,
        AuditModule,
        OrganizationsModule,
        UserAccountsModule,
      ],
      controllers: [AuthorizationController, RoleAssignmentsController],
      providers,
      exports: [
        AuthorizationService,
        RoleAssignmentsService,
        PermissionGuard,
        PERMISSION_EVALUATOR,
        AUTHORIZATION_REPOSITORY,
        ROLE_ASSIGNMENTS_REPOSITORY,
      ],
    };
  }
}
