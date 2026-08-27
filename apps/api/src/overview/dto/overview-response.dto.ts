import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityPageDto } from '../../activity/dto/activity-response.dto.js';
import { BalanceResponseDto } from '../../balances/dto/balance-response.dto.js';
import { LedgerResponseDto } from '../../ledgers/dto/ledger-response.dto.js';
import { PlanResponseDto } from '../../plans/dto/plan-response.dto.js';
import { SettlementResponseDto } from '../../settlements/dto/settlement-response.dto.js';

class LedgerBalanceOverviewDto {
  @ApiProperty({ format: 'uuid' }) ledgerId!: string;
  @ApiProperty({ type: BalanceResponseDto }) balance!: BalanceResponseDto;
}

class PlanBalanceOverviewDto {
  @ApiProperty({ format: 'uuid' }) planId!: string;
  @ApiProperty({ type: BalanceResponseDto }) balance!: BalanceResponseDto;
}

export class OverviewResponseDto {
  @ApiProperty({ type: LedgerResponseDto, isArray: true })
  ledgers!: LedgerResponseDto[];

  @ApiProperty({ type: PlanResponseDto, isArray: true })
  plans!: PlanResponseDto[];

  @ApiProperty({ type: LedgerBalanceOverviewDto, isArray: true })
  ledgerBalances!: LedgerBalanceOverviewDto[];

  @ApiProperty({ type: PlanBalanceOverviewDto, isArray: true })
  planBalances!: PlanBalanceOverviewDto[];

  @ApiPropertyOptional({ type: ActivityPageDto, nullable: true })
  activity!: ActivityPageDto | null;

  @ApiProperty({ type: SettlementResponseDto, isArray: true })
  pendingPayments!: SettlementResponseDto[];
}
