import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SettlementStatus } from '../../generated/prisma/client.js';

class SafeSettlementUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}

export class SettlementResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  ledgerId!: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) planId!:
    string | null;
  @ApiProperty({ format: 'uuid' }) fromUserId!: string;
  @ApiProperty({ format: 'uuid' }) toUserId!: string;
  @ApiProperty({ type: SafeSettlementUserDto })
  fromUser!: SafeSettlementUserDto;
  @ApiProperty({ type: SafeSettlementUserDto }) toUser!: SafeSettlementUserDto;
  @ApiProperty({ type: String }) amountMinor!: string;
  @ApiProperty({ example: 'TRY' }) currency!: string;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() settledAt!: Date;
  @ApiProperty({ format: 'uuid' }) createdById!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({
    enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'VOID'],
  })
  status!: SettlementStatus;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  confirmedById!: string | null;
  @ApiPropertyOptional({ type: SafeSettlementUserDto, nullable: true })
  confirmedBy!: SafeSettlementUserDto | null;
  @ApiPropertyOptional({ nullable: true }) confirmedAt!: Date | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  rejectedById!: string | null;
  @ApiPropertyOptional({ type: SafeSettlementUserDto, nullable: true })
  rejectedBy!: SafeSettlementUserDto | null;
  @ApiPropertyOptional({ nullable: true }) rejectedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) cancelledAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) voidedAt!: Date | null;
}
