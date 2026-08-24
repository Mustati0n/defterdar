# R4 Performance Report

Measurements use the same production build and gzip-union method before and
after remediation. Run `pnpm --filter @defterdar/web build` followed by
`pnpm --filter @defterdar/web perf:measure` to repeat the bundle measurement.

## Request formulas

| Surface                | Before                                                                | After                                                               |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Overview initial       | `3 + 2L + P`                                                          | `1` aggregate read                                                  |
| Plan list initial      | `1 + L`                                                               | `2` (`ledgers` + user Plans), independent of `L`                    |
| Expense detail initial | `2 + R` (`expense`, attachments, availability per reimbursable split) | `2`; one availability read only after the relevant action is opened |
| Completed onboarding   | `1` global Ledger read                                                | `0`                                                                 |
| Ledger list cards      | `1 + 2L`                                                              | `1`; active member/Plan counts ride with Ledger list data           |

Ledger and Plan detail queries now follow the URL view. General loads only the
data it renders; Activity, analytics, balances, members/participants,
invitations and settlements remain disabled until their surface is active.
TanStack Query cancellation signals reach `fetch`, so abandoned view requests
can be aborted.

## Production bundle gzip estimates

| Route                 |    Before |     After |    Change |
| --------------------- | --------: | --------: | --------: |
| `/login`              | 268,040 B | 268,415 B |    +375 B |
| `/ledgers`            | 288,947 B | 213,412 B | -75,535 B |
| `/plans`              | 288,785 B | 213,118 B | -75,667 B |
| `/expenses/new` shell | 289,101 B | 210,778 B | -78,323 B |
| `/incomes/new` shell  | 285,926 B | 210,778 B | -75,148 B |

The 75,256-byte gzip Zod chunk remains necessary for auth/form validation but
is no longer referenced by the initial Ledger, Plan, Expense shell or Income
shell HTML. Create dialogs load on intent; Expense and Income forms load behind
small route shells. Login stays effectively flat because its form is the route's
primary task and must validate immediately.

## Source and CSS

| Metric     |    Before |    After |
| ---------- | --------: | -------: |
| Client TSX |   37 / 75 |  36 / 77 |
| Global CSS | 101,823 B | 98,694 B |

Static Ledger card and Expense indicator rendering no longer create client
boundaries or per-card/per-row queries. Confirmed dead settings, profile, chart,
status and removed onboarding scenario selectors were deleted. The body font is
now explicitly a system stack; no unrequested web-font cost was added.

## Freshness, DOM and motion decisions

- Global focus refetch remains disabled to avoid a request storm. Balance and
  settlement queries use a 15-second stale window and selective focus refetch;
  analytics uses a 60-second stale window.
- Activity retains cursor pagination but caps the mounted cache at five pages
  (100 rows), preventing unbounded DOM growth without a virtualization
  dependency.
- Per-route content entrance animation was removed, loading shimmer is finite,
  mobile dialog/onboarding blur is disabled, sidebar layout-property animation
  was removed, and upload progress now animates `transform: scaleX()`.
- Receipt rows never load full-resolution media or signed URLs eagerly. Signed
  URLs are still requested only when the user opens a READY attachment, and
  list indicators use attachment counts instead of extra attachment requests.
- The cold auth `refresh → users/me → protected data` trust chain remains intact.
  Removing its validation step would trade security semantics for latency, so
  R4 leaves it unchanged.
- No speculative Expense form memo tree was added without profiler evidence;
  route/form code splitting produced the measurable gain while preserving R3
  behavior.
