import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.js';
import { InMemoryObjectStorageService } from './in-memory-object-storage.service.js';
import { ObjectStorageService } from './object-storage.service.js';
import { S3ObjectStorageService } from './s3-object-storage.service.js';

@Module({
  providers: [
    {
      provide: ObjectStorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        config.get('NODE_ENV', { infer: true }) === 'test'
          ? new InMemoryObjectStorageService()
          : new S3ObjectStorageService(config),
    },
  ],
  exports: [ObjectStorageService],
})
export class StorageModule {}
