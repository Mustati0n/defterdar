import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LedgerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

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

  @ApiPropertyOptional({ minimum: 1 })
  activeMemberCount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  activePlanCount?: number;

  @ApiPropertyOptional({
    description:
      'Derived from active membership; true when the ledger has members beyond the owner.',
  })
  isCollaborative?: boolean;
}

export class OwnershipTransferResponseDto {
  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ format: 'uuid' })
  ownerId!: string;
}
