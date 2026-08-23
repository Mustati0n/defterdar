import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class TokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({
    example: 900,
    description: 'Access token lifetime in seconds',
  })
  expiresIn!: number;
}

export class AuthResponseDto extends TokenResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
