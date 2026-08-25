import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ActivityActorDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}

export class ActivityItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  ledgerId!: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  planId!: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) actorUserId!:
    string | null;
  @ApiPropertyOptional({ type: ActivityActorDto, nullable: true })
  actor!: ActivityActorDto | null;
  @ApiProperty() entityType!: string;
  @ApiProperty({ format: 'uuid' }) entityId!: string;
  @ApiProperty() action!: string;
  @ApiProperty({ type: Object }) metadata!: Record<string, unknown>;
  @ApiProperty() createdAt!: Date;
}

export class ActivityPageDto {
  @ApiProperty({ type: ActivityItemDto, isArray: true })
  items!: ActivityItemDto[];
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) nextCursor!:
    string | null;
}
