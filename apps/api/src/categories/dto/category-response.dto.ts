import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) ledgerId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['EXPENSE', 'INCOME', 'BOTH'] }) kind!: string;
  @ApiProperty({ format: 'uuid' }) createdById!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) archivedAt!: Date | null;
}
