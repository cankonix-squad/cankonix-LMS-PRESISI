import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GraduationController } from './graduation.controller';
import { PrismaGraduationRepository } from './graduation.repository';
import { GraduationService } from './graduation.service';
import { GRADUATION_REPOSITORY } from './graduation.types';

/**
 * Graduation module (TASK-052).
 *
 * Exports the service and repository token so TASK-053 (the formal graduation
 * decision) can consume an evaluation rather than recomputing one — the decision
 * must act on the snapshot that was recorded, not on a fresh calculation.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GraduationController],
  providers: [
    GraduationService,
    {
      provide: GRADUATION_REPOSITORY,
      useClass: PrismaGraduationRepository,
    },
  ],
  exports: [GraduationService, GRADUATION_REPOSITORY],
})
export class GraduationModule {}
