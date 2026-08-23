import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiPropertyOptional({ example: 'ahmet@example.com', nullable: true })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toLowerCase();
    return normalized || undefined;
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
