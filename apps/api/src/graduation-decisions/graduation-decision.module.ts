import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GraduationDecisionController } from './graduation-decision.controller';
import { PrismaGraduationDecisionRepository } from './graduation-decision.repository';
import { GraduationDecisionService } from './graduation-decision.service';
import { GRADUATION_DECISION_REPOSITORY } from './graduation-decision.types';

/**
 * Graduation decision module (TASK-053).
 *
 * Separate from the graduation module (TASK-052) on purpose: evaluation is a
 * computed judgement, decision is a formal human act, and they have different
 * lifecycles and different authorities. Keeping them in separate modules is what
 * lets the decision survive a re-evaluation, and lets a future certificate
 * feature (TASK-054) depend on decisions without pulling in the evaluator.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GraduationDecisionController],
  providers: [
    GraduationDecisionService,
    {
      provide: GRADUATION_DECISION_REPOSITORY,
      useClass: PrismaGraduationDecisionRepository,
    },
  ],
  exports: [GraduationDecisionService, GRADUATION_DECISION_REPOSITORY],
})
export class GraduationDecisionModule {}
