import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto.js';

class SafeExpenseUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}
export class ExpenseSplitResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: SafeExpenseUserDto }) user!: SafeExpenseUserDto;
  @ApiProperty({
    type: String,
    description: 'Minor-unit integer serialized as a decimal string',
  })
  amountMinor!: string;
  @ApiProperty({
    description: 'False for gifts and the payer’s own normal split',
  })
  isReimbursable!: boolean;
  @ApiProperty({ type: String }) offsetAppliedMinor!: string;
  @ApiProperty({ type: String }) remainingReimbursableMinor!: string;
  @ApiProperty() createdAt!: Date;
}
export class ExpenseResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) ledgerId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) planId!:
    string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) categoryId!:
    string | null;
  @ApiPropertyOptional({ type: CategoryResponseDto, nullable: true })
  category!: CategoryResponseDto | null;
  @ApiProperty({ format: 'uuid' }) createdById!: string;
  @ApiProperty({ format: 'uuid' }) payerId!: string;
  @ApiProperty({ type: SafeExpenseUserDto }) payer!: SafeExpenseUserDto;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({
    type: String,
    description: 'Minor-unit integer serialized as a decimal string',
  })
  amountMinor!: string;
  @ApiProperty({ example: 'TRY' }) currency!: string;
  @ApiProperty({ enum: ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'] })
  splitMethod!: string;
  @ApiProperty({ description: 'Gift/Ismarla: all splits are non-reimbursable' })
  isGift!: boolean;
  @ApiProperty() expenseDate!: Date;
  @ApiPropertyOptional({ nullable: true }) voidedAt!: Date | null;
  @ApiProperty({ minimum: 1 }) version!: number;
  @ApiProperty({ type: ExpenseSplitResponseDto, isArray: true })
  splits!: ExpenseSplitResponseDto[];
}
