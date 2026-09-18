import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsController } from './organizations.controller';
import {
  ORGANIZATIONS_REPOSITORY,
  PrismaOrganizationsRepository,
} from './organizations.repository';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [AuditModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    {
      provide: ORGANIZATIONS_REPOSITORY,
      useClass: PrismaOrganizationsRepository,
    },
  ],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
