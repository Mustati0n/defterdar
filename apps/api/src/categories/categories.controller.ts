import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { CategoriesService } from './categories.service.js';
import { CategoryResponseDto } from './dto/category-response.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@ApiTags('categories')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Post('ledgers/:ledgerId/categories')
  @ApiCreatedResponse({ type: CategoryResponseDto })
  create(@Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string, @CurrentUser() user: SafeUser, @Body() dto: CreateCategoryDto) {
    return this.service.create(ledgerId, user.id, dto);
  }

  @Get('ledgers/:ledgerId/categories')
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  list(@Param('ledgerId', new ParseUUIDPipe({ version: '4' })) ledgerId: string, @CurrentUser() user: SafeUser) {
    return this.service.list(ledgerId, user.id);
  }

  @Patch('categories/:categoryId')
  @ApiOkResponse({ type: CategoryResponseDto })
  update(@Param('categoryId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, user.id, dto);
  }

  @Post('categories/:categoryId/archive')
  @ApiOperation({ summary: 'Archive category without deleting financial history' })
  @ApiOkResponse({ type: CategoryResponseDto })
  archive(@Param('categoryId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser) {
    return this.service.archive(id, user.id);
  }
}
