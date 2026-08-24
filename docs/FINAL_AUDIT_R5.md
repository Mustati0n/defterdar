# R5 Maintainability and Audit Closure

## Closure status

The remediation tracker contains 26 audit IDs. All 26 are `DONE`; none are
deferred. Open counts are P0 `0`, P1 `0`, P2 `0`, and P3 `0`.

Manual device and assistive-technology QA is a separate release gate and has
not been executed. See `docs/MANUAL_PRODUCT_QA.md`.

## Measured before and after

Counts use the original audit baseline and the final Node 24 production build.
“Decision groups” means simultaneously visible groups that ask the user to
choose or enter something; collapsed optional content is not counted.

| Measure                                    |       Audit baseline |                                                                    Final |
| ------------------------------------------ | -------------------: | -----------------------------------------------------------------------: |
| Confirmed repeated/low-value copy findings |                   20 |                                                   0 open in source rerun |
| Ledger detail navigation                   | 6 equal destinations | SHARED `3` primary + `3` secondary; PERSONAL `2` primary + `2` secondary |
| Plan detail navigation                     | 6 equal destinations |                                              `3` primary + `3` secondary |
| Expense first-render decision groups       |                   12 |       7; date, metadata and 3 advanced split methods disclosed/defaulted |
| Onboarding steps                           |                    6 |                                                                        3 |
| PERSONAL shared-only primary surfaces      |                    4 |                                                                        0 |
| Overview initial requests                  |         `3 + 2L + P` |                                                                      `1` |
| Plan list initial requests                 |              `1 + L` |                                                  `2`, independent of `L` |
| Expense detail initial requests            |              `2 + R` |                 `2`; one eligibility request only after one action opens |
| Global CSS source                          |            101,823 B |                                                                 98,678 B |
| Explicit client TSX boundaries             |              37 / 75 |                                                                  34 / 84 |

The Expense count includes title, description, amount, Ledger, Plan, category,
inline category, date, payer, participants, split method and Ismarla in the
baseline. Final first render keeps title, amount, Ledger context, payer,
participants, the default EQUAL choice and Ismarla visible. Context can remove
the Ledger decision as well.

### Production JavaScript (gzip bytes)

| Route                 | Audit first load | Final first load | Audit route-only | Final route-only |
| --------------------- | ---------------: | ---------------: | ---------------: | ---------------: |
| `/login`              |          268,040 |          269,815 |            5,698 |           82,134 |
| `/ledgers`            |          288,947 |          213,935 |           26,605 |           26,254 |
| `/plans`              |          288,785 |          213,645 |           26,443 |           25,964 |
| `/expenses/new` shell |          289,101 |          211,291 |           26,759 |           23,610 |
| `/incomes/new` shell  |          285,926 |          211,291 |           23,584 |           23,610 |

Login remains effectively flat and retains immediate validation. Its route-only
number now owns the Zod validation chunk instead of treating it as shared; Zod
is isolated from the initial Ledger, Plan, Expense shell and Income shell loads.
The small R5 delta from the R4 measurement is accepted maintainability module
overhead; the audit-baseline reduction on task routes remains 74–78 KB gzip.

## Maintainability review

- Query keys now have one factory. Financial invalidation uses those canonical
  prefixes, and the previous 457-line hook module is a client barrel over
  feature files of 15–117 lines.
- Expense orchestration is 432 lines; validation/configuration and the natural
  Participants, Preview, Split Method and Ismarla sections are separate.
- Onboarding state/focus/transition orchestration is 177 lines and its three
  static product steps are separate.
- Ledger management is a two-line compatibility barrel over 212/196-line
  member and settings panels. Plan management is a three-line barrel over
  participant, settings and lifecycle components of 130/193/73 lines.
- `globals.css` is a 13-import manifest. The unchanged cascade is organized as
  tokens/base, auth, shell, collections, Overview, detail, dialogs/settings,
  onboarding, quick-create, financial forms/surfaces, motion and analytics/
  responsive files. A whitespace-insensitive token comparison against R4 is
  identical.
- Balance, analytics, offset, Overview, Ledger detail, category management and
  Expense edit remain cohesive. They already delegate dialogs/pure helpers or
  act as route/form orchestrators; splitting their shared state and mutation
  lifecycle would add callback abstractions without a separate responsibility.

## Final audit rerun

This is a source, test and production-build rerun—not manual device QA.

| Criterion                       | Result | Evidence                                                        |
| ------------------------------- | ------ | --------------------------------------------------------------- |
| Activity preview/feed collision | PASS   | Separate canonical keys and pagination regression               |
| Financial stale UI              | PASS   | One mutation invalidation matrix and mutation regressions       |
| Filtered analytics invalidation | PASS   | Prefix invalidation across every range                          |
| Overview fan-out                | PASS   | One aggregate query-count regression                            |
| Mobile auth                     | PASS   | Form-first DOM and `<=820px` CSS regression                     |
| Expense decision load           | PASS   | Simple defaults and collapsed advanced-method regression        |
| Focus contrast                  | PASS   | `>=3:1` computed contrast regression                            |
| Dialog focus                    | PASS   | Trap, initial focus, Escape, inert background and restore tests |
| Plan Activity scope             | PASS   | Plan ID reaches scoped activity pagination                      |
| PERSONAL complexity             | PASS   | Shared-only destinations/actions absent in regression           |
| URL state                       | PASS   | Link/deep-link/default/rerender regressions                     |
| Plan context                    | PASS   | Plan-bound Expense return and create routes preserve IDs        |
| Raw enums                       | PASS   | Canonical Turkish label tests and audited Expense rendering     |
| Onboarding load                 | PASS   | Three steps; advanced finance training absent                   |
| N+1 availability                | PASS   | Availability disabled until one relevant action opens           |
| Global onboarding fetch         | PASS   | Completed onboarding disables Ledger query                      |
| Navigation semantics            | PASS   | Labelled native link navigation, no fake tab ARIA               |
| Form errors                     | PASS   | Invalid controls reference their error messages                 |
| Touch targets                   | PASS   | Critical `44px` and safe-area CSS regression                    |
| Static checklist                | PASS   | Plan next step derives from current state                       |
| Dead CSS                        | PASS   | Confirmed selectors absent; CSS token stream preserved          |
| Motion cost                     | PASS   | Bounded shimmer, reduced-motion path and transform progress     |

## Audit ID closure

```text
QRY-01  → DONE
FIN-01  → DONE
FIN-02  → DONE
NET-01  → DONE
UX-01   → DONE
UX-02   → DONE
A11Y-01 → DONE
A11Y-02 → DONE
IA-01   → DONE
IA-02   → DONE
IA-03   → DONE
IA-04   → DONE
COPY-01 → DONE
COPY-02 → DONE
UX-03   → DONE
UX-04   → DONE
NET-02  → DONE
NET-03  → DONE
PERF-01 → DONE
A11Y-03 → DONE
A11Y-04 → DONE
MOB-01  → DONE
UX-05   → DONE
PERF-02 → DONE
MOT-01  → DONE
COPY-03 → DONE
```

## Verification environment

- `.nvmrc`: `24`
- root engine: `>=20.19 <25`
- package manager: `pnpm@11.22.0`
- executed runtime: Node `24.19.0`
- manual QA: **MANUAL QA NOT YET EXECUTED**
