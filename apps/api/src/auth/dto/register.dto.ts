import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'correct horse battery staple', minLength: 10 })
  @IsString()
  @Length(10, 128)
  password!: string;

  @ApiProperty({ example: 'Mustafa', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  displayName!: string;
}
