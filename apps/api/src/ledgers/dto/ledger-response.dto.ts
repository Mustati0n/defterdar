import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LedgerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ['PERSONAL', 'SHARED'] })
  type!: 'PERSONAL' | 'SHARED';

  @ApiProperty({ example: 'TRY' })
  currency!: string;

  @ApiProperty({ format: 'uuid' })
  ownerId!: string;

  @ApiProperty({ enum: ['OWNER', 'ADMIN', 'MEMBER'] })
  role!: 'OWNER' | 'ADMIN' | 'MEMBER';

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  archivedAt!: Date | null;
}

export class OwnershipTransferResponseDto {
  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ format: 'uuid' })
  ownerId!: string;
}
