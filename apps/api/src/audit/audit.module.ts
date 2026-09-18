import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditContextInterceptor } from './audit-context.interceptor';
import { AuditContextService } from './audit-context.service';
import { AuditController } from './audit.controller';
import {
  AUDIT_LOG_REPOSITORY,
  PrismaAuditLogRepository,
} from './audit.repository';
import { AuditService } from './audit.service';

/**
 * Audit trail module (TASK-006).
 *
 * Two things make the trail reliable rather than best-effort:
 *
 * 1. `AuditService` is exported, so every domain service records through the same
 *    implementation — redaction, actor resolution, and request provenance are
 *    applied in exactly one place.
 * 2. `AuditContextInterceptor` is registered globally, so the actor and the
 *    request provenance are available to any service reached from a controller,
 *    including controllers added by later tasks, without those tasks wiring
 *    anything themselves.
 *
 * The append path is internal by design: no route lets a client author an audit
 * entry, only the read routes on `AuditController`.
 *
 * `PrismaModule` is global, so `PrismaService` reaches the repository without an
 * explicit import here.
 */
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditContextService,
    AuditContextInterceptor,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: PrismaAuditLogRepository,
    },
    // Registered globally so every controller added later is covered by default.
    // `useExisting` keeps a single interceptor instance.
    { provide: APP_INTERCEPTOR, useExisting: AuditContextInterceptor },
  ],
  exports: [AuditService, AuditContextService, AUDIT_LOG_REPOSITORY],
})
export class AuditModule {}
