import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PersonsModule } from '../persons/persons.module';
import { UserAccountsController } from './user-accounts.controller';
import {
  PrismaUserAccountsRepository,
  USER_ACCOUNTS_REPOSITORY,
} from './user-accounts.repository';
import { UserAccountsService } from './user-accounts.service';

@Module({
  imports: [AuditModule, PersonsModule],
  controllers: [UserAccountsController],
  providers: [
    UserAccountsService,
    {
      provide: USER_ACCOUNTS_REPOSITORY,
      useClass: PrismaUserAccountsRepository,
    },
  ],
  exports: [UserAccountsService],
})
export class UserAccountsModule {}
