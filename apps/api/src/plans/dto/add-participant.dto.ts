import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddParticipantDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}
