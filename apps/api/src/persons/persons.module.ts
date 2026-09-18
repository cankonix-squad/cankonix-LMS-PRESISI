import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PersonsController } from './persons.controller';
import {
  PERSONS_REPOSITORY,
  PrismaPersonsRepository,
} from './persons.repository';
import { PersonsService } from './persons.service';

@Module({
  imports: [AuditModule, OrganizationsModule],
  controllers: [PersonsController],
  providers: [
    PersonsService,
    { provide: PERSONS_REPOSITORY, useClass: PrismaPersonsRepository },
  ],
  exports: [PersonsService],
})
export class PersonsModule {}
