import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Raw opaque refresh token', minLength: 40 })
  @IsString()
  @Length(40, 128)
  refreshToken!: string;
}
