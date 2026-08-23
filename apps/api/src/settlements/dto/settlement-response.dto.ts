import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SafeSettlementUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}

export class SettlementResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) ledgerId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) planId!: string | null;
  @ApiProperty({ format: 'uuid' }) fromUserId!: string;
  @ApiProperty({ format: 'uuid' }) toUserId!: string;
  @ApiProperty({ type: SafeSettlementUserDto }) fromUser!: SafeSettlementUserDto;
  @ApiProperty({ type: SafeSettlementUserDto }) toUser!: SafeSettlementUserDto;
  @ApiProperty({ type: String }) amountMinor!: string;
  @ApiProperty({ example: 'TRY' }) currency!: string;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() settledAt!: Date;
  @ApiProperty({ format: 'uuid' }) createdById!: string;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ nullable: true }) voidedAt!: Date | null;
}
