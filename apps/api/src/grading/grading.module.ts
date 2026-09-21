import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  GradingController,
  GradingSchemesController,
} from './grading.controller';
import { GRADING_REPOSITORY, GradingService } from './grading.service';
import { PrismaGradingRepository } from './grading.repository';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GradingController, GradingSchemesController],
  providers: [
    GradingService,
    { provide: GRADING_REPOSITORY, useClass: PrismaGradingRepository },
  ],
  exports: [GradingService],
})
export class GradingModule {}
