import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SplitEntryDto {
  @IsUUID() userId!: string;
  @IsOptional() @IsInt() @Min(1) amountMinor?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10_000) percentageBps?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10_000) shares?: number;
}
export class SplitDto {
  @ApiProperty({ enum: ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'] })
  @IsIn(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'])
  method!: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  participantUserIds?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitEntryDto)
  entries?: SplitEntryDto[];
}
export class CreateExpenseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 160)
  title!: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) amountMinor!: number;
  @IsUUID() payerUserId!: string;
  @IsOptional() @IsUUID() planId?: string | null;
  @IsBoolean() isGift = false;
  @Type(() => Date) @IsDate() expenseDate!: Date;
  @ValidateNested() @Type(() => SplitDto) split!: SplitDto;
}
