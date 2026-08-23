import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { InvitationsController } from './invitations.controller.js';
import { LedgerAuthorizationService } from './ledger-authorization.service.js';
import { LedgerInvitationsController } from './ledger-invitations.controller.js';
import { LedgerInvitationsService } from './ledger-invitations.service.js';
import { LedgerMembersController } from './ledger-members.controller.js';
import { LedgerMembershipsService } from './ledger-memberships.service.js';
import { LedgersController } from './ledgers.controller.js';
import { LedgersService } from './ledgers.service.js';

@Module({
  imports: [AuthModule],
  controllers: [
    InvitationsController,
    LedgerInvitationsController,
    LedgerMembersController,
    LedgersController,
  ],
  providers: [
    LedgerAuthorizationService,
    LedgerInvitationsService,
    LedgerMembershipsService,
    LedgersService,
  ],
  exports: [LedgerAuthorizationService],
})
export class LedgersModule {}
