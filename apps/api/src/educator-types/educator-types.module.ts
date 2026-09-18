import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EducatorTypesController } from './educator-types.controller';
import {
  EDUCATOR_TYPES_REPOSITORY,
  PrismaEducatorTypesRepository,
} from './educator-types.repository';
import { EducatorTypesService } from './educator-types.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EducatorTypesController],
  providers: [
    EducatorTypesService,
    {
      provide: EDUCATOR_TYPES_REPOSITORY,
      useClass: PrismaEducatorTypesRepository,
    },
  ],
  exports: [EducatorTypesService, EDUCATOR_TYPES_REPOSITORY],
})
export class EducatorTypesModule {}
