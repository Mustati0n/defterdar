import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatedInvitationResponseDto {
  @ApiProperty({ description: 'Raw token returned only at creation' })
  token!: string;

  @ApiProperty()
  expiresAt!: Date;
}

export class InvitationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  invitedEmail!: string | null;

  @ApiProperty()
  expiresAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  acceptedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  revokedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AcceptedInvitationResponseDto {
  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ enum: ['MEMBER'] })
  role!: 'MEMBER';
}
