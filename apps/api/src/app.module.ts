import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { OrganizationsModule } from './organizations/organizations.module';
@Module({ imports: [HealthModule, OrganizationsModule] })
export class AppModule {}
