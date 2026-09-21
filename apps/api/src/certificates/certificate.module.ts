import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CertificateService } from './certificate.service';
import {
  CertificatesController,
  CertificateTemplatesController,
} from './certificate.controller';
import { PrismaCertificateRepository } from './certificate.repository';
import { CERTIFICATE_REPOSITORY } from './certificate.types';

/**
 * Certificate module (TASK-054).
 *
 * The repository is bound to the `CERTIFICATE_REPOSITORY` token rather than the
 * concrete class so the service depends on the contract, which is what lets the
 * service be tested against an in-memory repository without a database.
 *
 * Only the service is exported: another module that needs a certificate should
 * call the service, not reach into the repository and bypass eligibility.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CertificateTemplatesController, CertificatesController],
  providers: [
    CertificateService,
    {
      provide: CERTIFICATE_REPOSITORY,
      useClass: PrismaCertificateRepository,
    },
  ],
  exports: [CertificateService],
})
export class CertificateModule {}
