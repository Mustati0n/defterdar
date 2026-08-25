import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { LedgerPlansController } from './ledger-plans.controller.js';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';
import { PlanAuthorizationService } from './plan-authorization.service.js';
import { PlanInvitationAcceptController } from './plan-invitation-accept.controller.js';
import { PlanInvitationsController } from './plan-invitations.controller.js';
import { PlanInvitationsService } from './plan-invitations.service.js';

@Module({
  imports: [AuthModule, LedgersModule],
  controllers: [
    LedgerPlansController,
    PlanInvitationAcceptController,
    PlanInvitationsController,
    PlansController,
  ],
  providers: [PlanAuthorizationService, PlanInvitationsService, PlansService],
  exports: [PlanAuthorizationService, PlansService],
})
export class PlansModule {}
