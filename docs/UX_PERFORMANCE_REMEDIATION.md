# UX & Performance Remediation Tracker

This tracker turns the UX/performance audit findings into explicit remediation
workflows. Status is updated only after the listed verification is complete.

| ID | Severity | Area | Status | Workflow | Evidence | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| QRY-01 | P1 | Activity cache | DONE | R1 — Data consistency | Preview and infinite feed shared an incompatible query key | Regression: preview cache followed by paginated feed |
| FIN-01 | P1 | Financial cache | DONE | R1 — Data consistency | Expense/settlement/offset/income mutations had incomplete invalidation lists | Financial invalidation matrix unit tests and mutation regression tests |
| FIN-02 | P1 | Analytics cache | DONE | R1 — Data consistency | Range-shaped keys with `undefined` did not invalidate filtered analytics | Custom-range cache invalidation regression |
| NET-01 | P1 | Overview network | TODO | R4 — Performance | Overview request count grows as `3 + 2L + P` | Request trace and bounded fan-out verification |
| UX-01 | P1 | Mobile auth | TODO | R2 — Core UX | Auth story precedes the form on narrow screens | Mobile viewport task test |
| UX-02 | P1 | Expense form | TODO | R2 — Core UX | Core expense entry exposes advanced decisions immediately | First-expense task test |
| A11Y-01 | P1 | Focus contrast | TODO | R3 — Accessibility | Focus ring contrast is below the component contrast target on light surfaces | Automated contrast plus keyboard QA |
| A11Y-02 | P1 | Dialog focus | TODO | R3 — Accessibility | Several dialogs do not trap and restore focus | Keyboard and screen-reader dialog tests |
| IA-01 | P2 | Plan Activity scope | DONE | R1 — Data consistency | Plan Activity rendered Ledger-wide events | API and UI regression for Plan-filtered pagination |
| IA-02 | P2 | Personal Ledger scope | TODO | R2 — Core UX | Shared-only surfaces remain visible in PERSONAL Ledgers | Personal-user journey test |
| IA-03 | P2 | Detail navigation | TODO | R2 — Core UX | Detail tab state is not represented in the URL | Deep-link/back-navigation test |
| IA-04 | P2 | Expense context | TODO | R2 — Core UX | Plan-bound Expense back link loses Plan context | Plan journey navigation test |
| COPY-01 | P2 | Split terminology | TODO | R2 — Core UX | Raw split enum is visible in Expense detail | User-facing terminology assertion |
| COPY-02 | P2 | Role terminology | TODO | R2 — Core UX | Raw member role is visible in member management | User-facing terminology assertion |
| UX-03 | P2 | Overview trust | DONE | R1 — Data consistency | First Ledger metrics were presented as general metrics | Overview scope-label regression |
| UX-04 | P2 | Onboarding | TODO | R2 — Core UX | Six-step onboarding teaches advanced concepts before first value | First-run usability test |
| NET-02 | P2 | Offset requests | TODO | R4 — Performance | Expense detail requests availability per reimbursable split | Request-count regression |
| NET-03 | P2 | Global Ledger query | TODO | R4 — Performance | Completed onboarding still starts a Ledger list query | Protected-route request test |
| PERF-01 | P2 | Route bundles | TODO | R4 — Performance | Form/list routes carry the largest client bundles | Production bundle budget |
| A11Y-03 | P2 | Tab semantics | TODO | R3 — Accessibility | Detail tabs lack tablist/tab/tabpanel semantics | Accessibility tree test |
| A11Y-04 | P2 | Form errors | TODO | R3 — Accessibility | Field errors are not consistently associated with their controls | Screen-reader form test |
| MOB-01 | P2 | Touch targets | TODO | R3 — Accessibility | Several icon controls are below the recommended touch target | Mobile target-size audit |
| UX-05 | P2 | Plan checklist | TODO | R2 — Core UX | Checklist is not derived from Plan state | Plan lifecycle test |
| PERF-02 | P3 | CSS maintenance | TODO | R4 — Performance | Global stylesheet contains unused legacy selector groups | CSS usage and production-size verification |
| MOT-01 | P3 | Motion | TODO | R4 — Performance | Route and loading motion repeats broadly | Reduced-motion and interaction profile |
| COPY-03 | P3 | Settings content | TODO | R2 — Core UX | Low-task-value About content competes with settings | Settings task review |

## Workflow gates

- **R1:** Runtime stability and financial data consistency.
- **R2:** Core task and information-architecture simplification.
- **R3:** Accessibility and mobile reliability.
- **R4:** Network, bundle, render, CSS and motion performance.
- **R5:** Cross-browser/manual QA and release verification after R2–R4.
