import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MovePlanDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetLedgerId!: string;
}
