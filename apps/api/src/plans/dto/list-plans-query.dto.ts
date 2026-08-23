import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPlansQueryDto {
  @ApiPropertyOptional({ default: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  includeArchived = false;
}
