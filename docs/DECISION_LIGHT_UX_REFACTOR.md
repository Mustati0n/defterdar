# Decision-Light UX Refactor

Ürün kuralı: Kullanıcıdan, uygulamanın bağlamdan güvenle çıkarabileceği bir
karar istenmez. Arayüz backend/domain terminolojisi yerine insan eylemlerini
kullanır.

## Tracker

- [x] A — Ledger collaboration model (derive from membership)
- [x] B — Ledger creation flow (remove type selector, optional invite)
- [x] C — Plan creation simplification (infer scope from context)
- [x] D — Expense decision reduction (payer/split/Ismarla)
- [x] E — Context/default inference (currency, analytics, FAB)
- [x] F — Slim adaptive header system
- [x] G — Visual material system (ledger/plan colors)
- [x] H — Layout and interaction fixes
- [ ] I — Full QA / deploy

## Progress notes

### A — Ledger collaboration model

- `LedgerType` enum and `Ledger.type` column removed via new migration
  `20260827000000_derive_ledger_collaboration`.
- Constraints/indexes that enforced the single-PERSONAL rule dropped
  (`Ledger_personal_owner_key`, `Ledger_personal_not_archived_check`,
  `protect_ledger_identity`); the canonical-owner constraint re-created without
  the PERSONAL single-member branch.
- `LedgersService` exposes a single `create` (no type); list/get return derived
  `activeMemberCount`, `activePlanCount`, `isCollaborative`.
- Invitations, leave, archive, transfer, and role changes no longer gate on
  ledger type; authorization roles (OWNER/ADMIN/MEMBER) unchanged.
- Overview derives collaborative ledgers from `activeMemberCount > 1`.

### B — Ledger creation flow

- Removed "Defter türü (Kişisel/Ortak)" selector.
- Added optional "Arkadaş ekle" area with multiple email invites; invitation
  delivery is non-transactional with partial-failure toast, never rolling back
  the created ledger.

### C — Plan creation

- Removed "Plan kapsamı (Bağımsız/Deftere bağlı)" selector.
- Context ledger (`initialLedgerId`) auto-binds and hides currency; global flow
  shows optional "Deftere ekle" select and inherits currency when bound.

### D — Expense decisions

- Default payer = current user; default split = Eşit; advanced methods behind
  "Paylaşımı değiştir"; Ismarla labelled "Ben ısmarlıyorum"; live summary shows
  the human split label.

### E — Context/default inference

- Currency inherited from ledger/plan; expense currency non-editable.
- Ledger/plan detail analytics scoped to that resource; global statistics keep
  last valid selection. FAB already context-aware; removed PERSONAL default
  lookups (first ledger now the default).

### F — Slim adaptive headers

- `PageHeading` wraps eyebrow+description in `.page-heading__intro` which
  collapses (max-height/opacity) and stops intercepting pointers; title scales
  further; reserved min-height reduced. Mobile/reduced-motion fallbacks kept.

### G — Visual material

- Single-person ledger warm-white notebook; collaborative ledger gets wine
  spine/accent (`.ledger-card--collaborative`) plus "N kişi" text.
- Ledger detail cover gets a collaborative accent.
- Plan cards moved to a light-yellow paper family with deterministic variants.

### H — Layout/interaction

- Ledger detail sections separated with `--detail-grid` margin.
- Activity moved to secondary "Hareket geçmişi" (ledger + plan).
- Insight copy already truthful for uncategorized spending.
