import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsController } from './organizations.controller';
import {
  ORGANIZATIONS_REPOSITORY,
  PrismaOrganizationsRepository,
} from './organizations.repository';
import { OrganizationsService } from './organizations.service';

@Module({
  controllers: [OrganizationsController],
  providers: [
    PrismaService,
    OrganizationsService,
    {
      provide: ORGANIZATIONS_REPOSITORY,
      useClass: PrismaOrganizationsRepository,
    },
  ],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
