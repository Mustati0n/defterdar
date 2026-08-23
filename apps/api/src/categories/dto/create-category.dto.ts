import { Transform } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({ enum: ['EXPENSE', 'INCOME', 'BOTH'] })
  @IsIn(['EXPENSE', 'INCOME', 'BOTH'])
  kind!: 'EXPENSE' | 'INCOME' | 'BOTH';
}
