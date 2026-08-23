import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Güncel gezi planı', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date | null;
}
