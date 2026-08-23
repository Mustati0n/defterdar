import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'correct horse battery staple' })
  @IsString()
  @Length(1, 128)
  password!: string;
}
