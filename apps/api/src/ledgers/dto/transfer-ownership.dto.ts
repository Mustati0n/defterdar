import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferOwnershipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  newOwnerUserId!: string;
}
