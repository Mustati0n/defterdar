import { ApiProperty } from '@nestjs/swagger';
class BalanceUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}
class BalancePositionDto {
  @ApiProperty({ type: BalanceUserDto }) user!: BalanceUserDto;
  @ApiProperty({
    type: Number,
    description: 'Positive receives; negative owes',
  })
  netMinor!: number;
}
class SuggestionDto {
  @ApiProperty({ format: 'uuid' }) fromUserId!: string;
  @ApiProperty({ format: 'uuid' }) toUserId!: string;
  @ApiProperty({ type: Number, minimum: 1 }) amountMinor!: number;
}
export class BalanceResponseDto {
  @ApiProperty({ example: 'TRY' }) currency!: string;
  @ApiProperty({ type: BalancePositionDto, isArray: true })
  positions!: BalancePositionDto[];
  @ApiProperty({ type: SuggestionDto, isArray: true })
  suggestions!: SuggestionDto[];
}
