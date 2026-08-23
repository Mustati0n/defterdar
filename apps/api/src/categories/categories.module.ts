import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

@Module({
  imports: [AuthModule, LedgersModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
