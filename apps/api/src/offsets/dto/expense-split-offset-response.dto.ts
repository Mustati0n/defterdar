import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OffsetAvailabilityResponseDto {
  @ApiProperty({ format: 'uuid' }) expenseSplitId!: string;
  @ApiProperty() eligible!: boolean;
  @ApiProperty({ type: String }) splitAmountMinor!: string;
  @ApiProperty({ type: String }) offsetAppliedMinor!: string;
  @ApiProperty({ type: String }) remainingReimbursableMinor!: string;
  @ApiProperty({ type: String }) priorSuggestionMinor!: string;
  @ApiProperty({ type: String }) maxOffsetMinor!: string;
  @ApiPropertyOptional({ nullable: true }) reason!: string | null;
}

export class ExpenseSplitOffsetResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) expenseSplitId!: string;
  @ApiProperty({ type: String }) amountMinor!: string;
  @ApiProperty({ format: 'uuid' }) createdById!: string;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ nullable: true }) voidedAt!: Date | null;
}
