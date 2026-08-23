import { ApiProperty } from '@nestjs/swagger';

class MemberUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  displayName!: string;
}

export class MemberResponseDto {
  @ApiProperty({ type: MemberUserResponseDto })
  user!: MemberUserResponseDto;

  @ApiProperty({ enum: ['OWNER', 'ADMIN', 'MEMBER'] })
  role!: 'OWNER' | 'ADMIN' | 'MEMBER';

  @ApiProperty()
  joinedAt!: Date;
}
