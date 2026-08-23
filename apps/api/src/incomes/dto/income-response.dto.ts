import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto.js';

export class IncomeResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) ledgerId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) planId!: string | null;
  @ApiProperty({ format: 'uuid' }) createdById!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ type: String }) amountMinor!: string;
  @ApiProperty({ example: 'TRY' }) currency!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) categoryId!: string | null;
  @ApiPropertyOptional({ type: CategoryResponseDto, nullable: true }) category!: CategoryResponseDto | null;
  @ApiProperty() incomeDate!: Date;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) voidedAt!: Date | null;
}
