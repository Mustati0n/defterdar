import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { ActivityLogService } from './activity-log.service.js';
import { ActivityController } from './activity.controller.js';

@Global()
@Module({
  imports: [AuthModule, LedgersModule],
  controllers: [ActivityController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityModule {}
