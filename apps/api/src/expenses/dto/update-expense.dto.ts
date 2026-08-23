import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { CreateExpenseDto } from './create-expense.dto.js';
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {
  override isGift: boolean | undefined = undefined;
  @ApiProperty({ minimum: 1, description: 'Current Expense version' })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  expectedVersion!: number;
}
