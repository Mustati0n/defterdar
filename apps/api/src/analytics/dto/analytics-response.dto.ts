import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BalanceResponseDto } from '../../balances/dto/balance-response.dto.js';

class AnalyticsCategoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

class CategorySummaryDto {
  @ApiPropertyOptional({ type: AnalyticsCategoryDto, nullable: true })
  category!: AnalyticsCategoryDto | null;
  @ApiProperty({ type: String }) expenseMinor!: string;
  @ApiProperty({ type: String }) incomeMinor!: string;
}

class MonthlySummaryDto {
  @ApiProperty({ example: '2026-08' }) month!: string;
  @ApiProperty({ type: String }) expenseMinor!: string;
  @ApiProperty({ type: String }) incomeMinor!: string;
}

class AnalyticsUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}

class MemberAmountDto {
  @ApiProperty({ type: AnalyticsUserDto }) user!: AnalyticsUserDto;
  @ApiProperty({ type: String }) amountMinor!: string;
}

export class AnalyticsSummaryResponseDto {
  @ApiProperty({ example: 'TRY' }) currency!: string;
  @ApiProperty({ type: String }) totalExpenseMinor!: string;
  @ApiProperty({ type: String }) totalIncomeMinor!: string;
  @ApiProperty({ type: String }) netCashflowMinor!: string;
  @ApiProperty() expenseCount!: number;
  @ApiProperty() incomeCount!: number;
  @ApiProperty({ type: CategorySummaryDto, isArray: true })
  byCategory!: CategorySummaryDto[];
  @ApiProperty({ type: MonthlySummaryDto, isArray: true })
  monthly!: MonthlySummaryDto[];
  @ApiProperty({ type: MemberAmountDto, isArray: true })
  paidByMember!: MemberAmountDto[];
  @ApiProperty({ type: MemberAmountDto, isArray: true })
  shareByMember!: MemberAmountDto[];
  @ApiProperty({ type: BalanceResponseDto })
  currentBalances!: BalanceResponseDto;
}
