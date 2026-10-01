import { Logger, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PersonsModule } from '../persons/persons.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { KeycloakProvisioningController } from './keycloak-provisioning.controller';
import { KeycloakProvisioningService } from './keycloak-provisioning.service';
import {
  KEYCLOAK_LINK_REPOSITORY,
  PrismaKeycloakLinkRepository,
} from './keycloak-link.repository';
import { KeycloakAdminClient } from './keycloak-admin-client';
import { KEYCLOAK_ADMIN } from './keycloak-admin.port';
import {
  loadKeycloakAdminConfig,
  warnUnconfiguredKeycloakAdmin,
} from './keycloak-admin.config';
import { UnconfiguredKeycloakAdmin } from './unconfigured-keycloak-admin';

/**
 * Keycloak user provisioning module (Admin portal).
 *
 * The adapter is bound with `useFactory` so the configuration is resolved once
 * at startup and the warning is logged once, mirroring the file-storage module.
 * When the environment has no provisioning credentials the module still loads —
 * the API has non-provisioning features that must keep working — but the binding
 * is a null object that refuses every call with a clear reason instead of
 * pretending the account was created.
 */
@Module({
  imports: [PrismaModule, AuditModule, PersonsModule, UserAccountsModule],
  controllers: [KeycloakProvisioningController],
  providers: [
    KeycloakProvisioningService,
    {
      provide: KEYCLOAK_LINK_REPOSITORY,
      useClass: PrismaKeycloakLinkRepository,
    },
    {
      provide: KEYCLOAK_ADMIN,
      useFactory: () => {
        const { config, errors } = loadKeycloakAdminConfig();
        if (!config) {
          warnUnconfiguredKeycloakAdmin(errors);
          return new UnconfiguredKeycloakAdmin();
        }
        new Logger('KeycloakAdmin').log(
          `Keycloak user provisioning enabled for realm ${config.realm}`,
        );
        return new KeycloakAdminClient(config);
      },
    },
  ],
  exports: [KeycloakProvisioningService, KEYCLOAK_ADMIN],
})
export class KeycloakProvisioningModule {}
