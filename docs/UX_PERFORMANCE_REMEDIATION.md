# UX & Performance Remediation Tracker

This tracker turns the UX/performance audit findings into explicit remediation
workflows. Status is updated only after the listed verification is complete.

| ID | Severity | Area | Status | Workflow | Evidence | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| QRY-01 | P1 | Activity cache | DONE | R1 — Data consistency | Preview and infinite feed shared an incompatible query key | Regression: preview cache followed by paginated feed |
| FIN-01 | P1 | Financial cache | DONE | R1 — Data consistency | Expense/settlement/offset/income mutations had incomplete invalidation lists | Financial invalidation matrix unit tests and mutation regression tests |
| FIN-02 | P1 | Analytics cache | DONE | R1 — Data consistency | Range-shaped keys with `undefined` did not invalidate filtered analytics | Custom-range cache invalidation regression |
| NET-01 | P1 | Overview network | DONE | R4 — Performance | Overview uses one authorized aggregate read; Plan listing uses a single user-level endpoint | `3 + 2L + P → 1` and `1 + L → 2` query-count regressions |
| UX-01 | P1 | Mobile auth | DONE | R3 — Core task simplicity | Auth form is first in DOM/mobile order while desktop retains the brand panel on the left | DOM-order regression and <=820px layout rule |
| UX-02 | P1 | Expense form | DONE | R3 — Core task simplicity | Expense entry defaults to current payer, sensible participants and EQUAL; optional and advanced choices are disclosed on demand | Simple path and advanced-method regressions |
| A11Y-01 | P1 | Focus contrast | DONE | R3 — Accessibility | Global 3px wine focus indicator exceeds 3:1 against light surfaces | Automated contrast and CSS regression |
| A11Y-02 | P1 | Dialog focus | DONE | R3 — Accessibility | Shared modal behavior traps/restores focus, closes on Escape and makes background content inert | Keyboard dialog regression including safe destructive focus |
| IA-01 | P2 | Plan Activity scope | DONE | R1 — Data consistency | Plan Activity rendered Ledger-wide events | API and UI regression for Plan-filtered pagination |
| IA-02 | P2 | Personal Ledger scope | DONE | R2 — Core UX | PERSONAL now omits member, invitation, group balance and settlement surfaces | PERSONAL/SHARED detail regression |
| IA-03 | P2 | Detail navigation | DONE | R2 — Core UX | Ledger and Plan views use URL query state with safe defaults | Deep-link and rerender navigation regression |
| IA-04 | P2 | Expense context | DONE | R2 — Core UX | Plan-bound Expenses link back to their Plan | Plan Expense navigation regression |
| COPY-01 | P2 | Split terminology | DONE | R2 — Core UX | Split methods map to canonical Turkish labels | User-facing terminology assertion |
| COPY-02 | P2 | Role terminology | DONE | R2 — Core UX | Member roles map to canonical Turkish labels | User-facing terminology assertion |
| UX-03 | P2 | Overview trust | DONE | R1 — Data consistency | First Ledger metrics were presented as general metrics | Overview scope-label regression |
| UX-04 | P2 | Onboarding | DONE | R3 — Core task simplicity | Onboarding is three core steps without balance, settlement or advanced-split training | Step-count and content regression |
| NET-02 | P2 | Offset requests | DONE | R4 — Performance | Offset availability is disabled at page load and fetched only when its action is opened | Expense-detail request-count regression |
| NET-03 | P2 | Global Ledger query | DONE | R4 — Performance | Onboarding passes an explicit disabled boundary after completion | Completed-onboarding hook regression |
| PERF-01 | P2 | Route bundles | DONE | R4 — Performance | Create dialogs load on intent and Expense/Income forms load behind route shells; Zod stays out of read/list initial loads | Repeatable production gzip measurement |
| A11Y-03 | P2 | Tab semantics | DONE | R3 — Accessibility | Detail destinations use native links inside labelled navigation and wrap into a discoverable mobile grid | Navigation semantics and mobile CSS regression |
| A11Y-04 | P2 | Form errors | DONE | R3 — Accessibility | Core auth, Expense and create-dialog errors expose `aria-invalid` and reference their messages | Auth and Expense screen-reader form regressions |
| MOB-01 | P2 | Touch targets | DONE | R3 — Accessibility | Critical icon, quick-add, close, row and disclosure controls meet the 44px target with safe-area spacing | Automated critical-target and safe-area CSS regression |
| UX-05 | P2 | Plan checklist | DONE | R2 — Core UX | Plan next step derives from status, participants and Expenses | Plan lifecycle test |
| PERF-02 | P3 | CSS maintenance | DONE | R4 — Performance | Confirmed dead settings/profile/chart/status/scenario styles were removed and system-font intent is explicit | Global CSS `101,823 → 98,694` bytes |
| MOT-01 | P3 | Motion | DONE | R4 — Performance | Route animation removed, shimmer bounded, mobile blur reduced and upload progress uses transform | Motion CSS regression and reduced-motion suite |
| COPY-03 | P3 | Settings content | DONE | R2 — Core UX | About promotion removed and category management moved into Ledger context | Settings task review |

## Workflow gates

- **R1:** Runtime stability and financial data consistency.
- **R2:** Core task and information-architecture simplification.
- **R3:** Accessibility and mobile reliability.
- **R4:** Network, bundle, render, CSS and motion performance.
- **R5:** Cross-browser/manual QA and release verification after R2–R4.

## R2 information architecture decisions

- Ledger core navigation is `Genel`, `Bakiyeler` (SHARED only) and
  `İstatistikler`; full Activity, members and settings remain available under
  the lower-weight `Daha fazla` destination.
- Plan core navigation is `Genel`, `Hareketler` and `Hesap`; analytics,
  participants and settings remain available under `Daha fazla`. Plan
  completion/reopening stays directly available from `Genel`.
- Without usage analytics, these choices minimize the decisions required for
  expense review and account closing while retaining every management feature.
- Overview follows action required, quick actions, active Ledgers/Plans, then
  explicitly scoped recent Activity. Empty data sections are not rendered.
- Category management belongs to its Ledger settings context; global Settings
  is reserved for profile and low-weight product help.

## R3 core-task and accessibility decisions

- Expense creation exposes title, amount, payer, participants and EQUAL split
  first. Optional metadata and non-equal split methods remain available through
  native disclosure controls; editing preserves the EQUAL mental model when the
  persisted Expense used EQUAL.
- Onboarding contains only product purpose, Defter-versus-Plan context and the
  first-action choice. Financial mechanics remain contextual to their features.
- Mobile authentication places the form first, and detail navigation wraps into
  visible native links instead of relying on horizontally hidden destinations.
- Custom dialogs share focus trapping, Escape handling, sensible initial focus,
  focus restoration and inert background behavior. Destructive confirmation
  starts on the safe cancel action.
- Payment and offset flows present one financial direction or before/after
  summary, followed only by fields the user can change.

## R4 performance decisions

- Network formulas, production gzip measurements, freshness policy, receipt
  lifecycle and the deliberately retained auth trust chain are recorded in
  `docs/PERFORMANCE_R4.md`.
- Overview aggregation is read-only and reuses existing Ledger, Plan, balance
  and Activity services; no financial or authorization rule changed.
- Hidden detail views own their queries. Aggregate responses seed compatible
  shared cache keys, and financial mutations invalidate the Overview snapshot.
- Activity is capped at five loaded pages. Form memoization was not added
  without profiler evidence; bundle isolation delivered the measured gain.
