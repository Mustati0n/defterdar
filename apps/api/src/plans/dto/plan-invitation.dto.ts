import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanInvitationDto {
  @ApiProperty({ example: 'ahmet@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;
}

export class CreatedPlanInvitationResponseDto {
  @ApiProperty({ description: 'Raw token returned only at creation' })
  token!: string;

  @ApiProperty()
  expiresAt!: Date;
}

export class PlanInvitationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  invitedEmail!: string;

  @ApiProperty()
  expiresAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  acceptedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  revokedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AcceptedPlanInvitationResponseDto {
  @ApiProperty({ format: 'uuid' })
  planId!: string;
}
