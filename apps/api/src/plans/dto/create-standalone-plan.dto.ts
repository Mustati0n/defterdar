import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreatePlanDto } from './create-plan.dto.js';

export class CreateStandalonePlanDto extends CreatePlanDto {
  @ApiProperty({ example: 'TRY', pattern: '^[A-Z]{3}$' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}
