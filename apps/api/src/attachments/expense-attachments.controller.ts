import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { SafeUser } from '../users/dto/user-response.dto.js';
import { CreateExpenseAttachmentDto } from './dto/create-expense-attachment.dto.js';
import { AttachmentUploadResponseDto, AttachmentUrlResponseDto, ExpenseAttachmentResponseDto } from './dto/expense-attachment-response.dto.js';
import { ExpenseAttachmentsService } from './expense-attachments.service.js';

@ApiTags('expense attachments')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller()
export class ExpenseAttachmentsController {
  constructor(private readonly service: ExpenseAttachmentsService) {}

  @Post('expenses/:expenseId/attachments')
  @ApiOperation({ summary: 'Reserve an attachment and return a presigned upload URL' })
  @ApiCreatedResponse({ type: AttachmentUploadResponseDto })
  create(@Param('expenseId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser, @Body() dto: CreateExpenseAttachmentDto) {
    return this.service.create(id, user.id, dto);
  }

  @Post('attachments/:attachmentId/complete')
  @ApiOkResponse({ type: ExpenseAttachmentResponseDto })
  complete(@Param('attachmentId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser) {
    return this.service.complete(id, user.id);
  }

  @Get('attachments/:attachmentId/url')
  @ApiOkResponse({ type: AttachmentUrlResponseDto })
  url(@Param('attachmentId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser) {
    return this.service.url(id, user.id);
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(@Param('attachmentId', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: SafeUser) {
    await this.service.remove(id, user.id);
  }
}
