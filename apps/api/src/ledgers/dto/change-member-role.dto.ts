import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeMemberRoleDto {
  @ApiProperty({ enum: ['ADMIN', 'MEMBER'] })
  @IsIn(['ADMIN', 'MEMBER'])
  role!: 'ADMIN' | 'MEMBER';
}
