import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import {
  EDUCATION_PROGRAMS_REPOSITORY,
  PrismaEducationProgramsRepository,
} from './education-programs.repository';
import { EducationProgramsController } from './education-programs.controller';
import { EducationProgramsService } from './education-programs.service';

@Module({
  imports: [AuditModule, OrganizationsModule],
  controllers: [EducationProgramsController],
  providers: [
    EducationProgramsService,
    {
      provide: EDUCATION_PROGRAMS_REPOSITORY,
      useClass: PrismaEducationProgramsRepository,
    },
  ],
  exports: [EducationProgramsService],
})
export class EducationProgramsModule {}
