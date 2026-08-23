import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLedgerDto {
  @ApiPropertyOptional({ example: 'Yeni Defter Adı', maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({
    example: 'Güncel açıklama',
    maxLength: 500,
    nullable: true,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
