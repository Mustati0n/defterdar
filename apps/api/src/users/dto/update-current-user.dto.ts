import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCurrentUserDto {
  @ApiProperty({ example: 'Mustafa', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  displayName!: string;
}
