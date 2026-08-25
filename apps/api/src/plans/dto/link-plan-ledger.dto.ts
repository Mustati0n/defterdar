import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkPlanLedgerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  ledgerId!: string;
}
