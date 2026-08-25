import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  ledgerId!: string | null;

  @ApiProperty({ enum: ['LEDGER', 'STANDALONE'] })
  scope!: 'LEDGER' | 'STANDALONE';

  @ApiProperty({ example: 'TRY' })
  currency!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  startsAt!: Date | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  endsAt!: Date | null;

  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'] })
  status!: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

  @ApiProperty({ format: 'uuid' })
  createdById!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  archivedAt!: Date | null;

  @ApiProperty({ minimum: 0 })
  participantCount!: number;
}

class ParticipantUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  displayName!: string;
}

export class PlanParticipantResponseDto {
  @ApiProperty({ type: ParticipantUserResponseDto })
  user!: ParticipantUserResponseDto;

  @ApiProperty()
  createdAt!: Date;
}
