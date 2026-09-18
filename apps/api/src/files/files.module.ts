import { Logger, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesController } from './files.controller';
import {
  DEFAULT_FILE_SERVICE_OPTIONS,
  FILE_SERVICE_OPTIONS,
  FilesService,
  UPLOAD_POLICY,
} from './files.service';
import { OBJECT_STORAGE } from './object-storage.port';
import { S3CompatibleObjectStorage } from './s3-object-storage.adapter';
import {
  STORED_FILES_REPOSITORY,
  PrismaStoredFilesRepository,
} from './stored-files.repository';
import { loadStorageConfig, warnUnconfiguredStorage } from './storage.config';
import { DEFAULT_UPLOAD_POLICY } from './upload-policy';

/**
 * File management module (TASK-022).
 *
 * Storage is bound through a port. When the environment has no storage
 * configuration the module still loads — the API has non-file features that must
 * keep working — but the binding is a null object that refuses every operation
 * with 503 instead of pretending to succeed. Failing closed is the only sane
 * behaviour for a capability-issuing service.
 *
 * The adapter is bound with `useFactory` rather than `useClass` so the
 * configuration is resolved once at startup and the warning is logged once,
 * instead of on every request.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: STORED_FILES_REPOSITORY,
      useClass: PrismaStoredFilesRepository,
    },
    {
      provide: OBJECT_STORAGE,
      useFactory: () => {
        const { config, errors } = loadStorageConfig();
        if (!config) {
          warnUnconfiguredStorage(errors);
          return new UnconfiguredObjectStorage();
        }
        return new S3CompatibleObjectStorage(config);
      },
    },
    {
      provide: UPLOAD_POLICY,
      useValue: DEFAULT_UPLOAD_POLICY,
    },
    {
      provide: FILE_SERVICE_OPTIONS,
      useValue: DEFAULT_FILE_SERVICE_OPTIONS,
    },
  ],
  exports: [FilesService, OBJECT_STORAGE, UPLOAD_POLICY, FILE_SERVICE_OPTIONS],
})
export class FilesModule {}

/**
 * Null object for the unconfigured case.
 *
 * Every method rejects with a clear reason. This is deliberately not a silent
 * no-op: a fake success would let a caller believe a file was stored, and the
 * failure would surface much later as a broken reference.
 */
class UnconfiguredObjectStorage {
  private readonly logger = new Logger('ObjectStorage');

  private fail(): never {
    throw new Error(
      'Object storage is not configured; set STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY',
    );
  }

  async createUploadUrl(): Promise<never> {
    this.logger.warn('Rejected upload URL request: storage is unconfigured');
    return this.fail();
  }

  async createDownloadUrl(): Promise<never> {
    this.logger.warn('Rejected download URL request: storage is unconfigured');
    return this.fail();
  }

  async headObject(): Promise<never> {
    return this.fail();
  }

  async removeObject(): Promise<never> {
    return this.fail();
  }
}
