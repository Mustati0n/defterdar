# Defterdar Product Model V2 Implementation

Baseline: `f211a9c chore: complete ux performance remediation`

- [x] A — Optional Personal Ledger
- [x] B — Standalone Plan domain
- [ ] C — Standalone finance integration
- [ ] D — Global adaptive UI system
- [ ] E — Overview / cards / spacing redesign
- [ ] F — Page intros + interface preferences
- [ ] G — Analytics / scope redesign
- [ ] H — Full QA / regression / final push

## Safety constraints

- Existing PERSONAL Ledgers and all financial history are preserved.
- Existing migrations are immutable; V2 uses new forward-only migrations.
- A financial record must retain a real Ledger or Plan scope.
- Ledger-bound behavior and authorization remain backward compatible.
- Manual browser/device QA is not claimed unless it is actually executed.

## Domain decisions

- Only an `ACTIVE` standalone Plan can be linked to a Ledger.
- Link requires matching currencies and active target memberships for every
  Plan participant.
- Activity rows remain immutable. Historical standalone events keep their Plan
  scope; the link transaction appends a target-Ledger event instead of rewriting
  audit history.
