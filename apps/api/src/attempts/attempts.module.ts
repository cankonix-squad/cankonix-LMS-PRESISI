import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttemptsController } from './attempts.controller';
import {
  ATTEMPTS_REPOSITORY,
  AttemptsService,
  PrismaAttemptsRepository,
} from './attempts.service';
@Module({
  imports: [PrismaModule],
  controllers: [AttemptsController],
  providers: [
    AttemptsService,
    { provide: ATTEMPTS_REPOSITORY, useClass: PrismaAttemptsRepository },
  ],
  exports: [AttemptsService],
})
export class AttemptsModule {}
