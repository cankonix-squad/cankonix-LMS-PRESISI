import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EnrollmentsController } from './enrollments.controller';
import {
  ENROLLMENTS_REPOSITORY,
  PrismaEnrollmentsRepository,
} from './enrollments.repository';
import { EnrollmentsService } from './enrollments.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EnrollmentsController],
  providers: [
    EnrollmentsService,
    {
      provide: ENROLLMENTS_REPOSITORY,
      useClass: PrismaEnrollmentsRepository,
    },
  ],
  exports: [EnrollmentsService, ENROLLMENTS_REPOSITORY],
})
export class EnrollmentsModule {}
