import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ExpenseAttachmentsController } from './expense-attachments.controller.js';
import { ExpenseAttachmentsService } from './expense-attachments.service.js';

@Module({
  imports: [AuthModule, LedgersModule, StorageModule],
  controllers: [ExpenseAttachmentsController],
  providers: [ExpenseAttachmentsService],
})
export class ExpenseAttachmentsModule {}
