import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive UTC timestamp' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'Inclusive UTC timestamp' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
