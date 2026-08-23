import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateExpenseSplitOffsetDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
    description: 'Omit to apply the current maximum available amount',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor?: number;
}
