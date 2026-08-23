import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttachmentUploadResponseDto {
  @ApiProperty({ format: 'uuid' }) attachmentId!: string;
  @ApiProperty() uploadUrl!: string;
  @ApiProperty() expiresAt!: Date;
}

export class ExpenseAttachmentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) expenseId!: string;
  @ApiProperty() originalFileName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty({ enum: ['PENDING', 'READY'] }) status!: string;
  @ApiProperty({ format: 'uuid' }) createdById!: string;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ nullable: true }) completedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) deletedAt!: Date | null;
}

export class AttachmentUrlResponseDto {
  @ApiProperty() url!: string;
  @ApiProperty() expiresAt!: Date;
}
