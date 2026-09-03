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

## Product Model V2 re-measure

Node `24.19.0` üzerinde aynı production build ve gzip-union yöntemiyle ölçüldü.
V2, standalone Plan domain'i ile adaptive UI/guidance sistemlerini eklerken R4'ün
route-level code-splitting kazanımlarını korur.

| Route                 | R4 before |  R4 after |  V2 final | V2 vs R4 after | V2 vs R4 before |
| --------------------- | --------: | --------: | --------: | -------------: | --------------: |
| `/login`              | 268,040 B | 268,415 B | 269,961 B |       +1,546 B |        +1,921 B |
| `/ledgers`            | 288,947 B | 213,412 B | 216,427 B |       +3,015 B |       -72,520 B |
| `/plans`              | 288,785 B | 213,118 B | 216,195 B |       +3,077 B |       -72,590 B |
| `/expenses/new` shell | 289,101 B | 210,778 B | 212,639 B |       +1,861 B |       -76,462 B |
| `/incomes/new` shell  | 285,926 B | 210,778 B | 212,639 B |       +1,861 B |       -73,287 B |

| Metric     | R4 before | R4 after |  V2 final | V2 vs R4 after |
| ---------- | --------: | -------: | --------: | -------------: |
| Client TSX |   37 / 75 |  36 / 77 |   41 / 94 |        +5 / 17 |
| Global CSS | 101,823 B | 98,694 B | 108,568 B |       +9,874 B |

V2'nin ölçülen ek maliyeti FAB, adaptive header, page intro ve user-scoped
preference istemci sınırlarından gelir. Ledger, Plan, Expense ve Income route'ları
yine R4 öncesinden 72–76 KB daha küçüktür. Global CSS görsel sistem genişlemesiyle
R4 sonrasından büyümüş, R4 öncesinin de 6,745 byte üzerine çıkmıştır; bu fark
saklanmamış ve pazarlama skoruna çevrilmemiştir.

### V2 request formulas

| Surface                | V2 final                                       |
| ---------------------- | ---------------------------------------------- |
| Overview initial       | `1` aggregate API request                      |
| Plan list initial      | `2` (`ledgers` + user Plans), `L`'den bağımsız |
| Expense detail initial | `2` (`expense` + attachments)                  |

Expense response artık erişim rolü ile Ledger/Plan lifecycle snapshot'larını
taşıdığı için detail route ayrı Ledger veya Plan isteği yapmaz. Availability
yalnız kullanıcı ilgili Borçtan düş aksiyonunu açtığında istenir.

## Confirmed Payments + Unified Workspace re-measure

Node `24.19.0` üzerinde production build sonrasında aynı gzip-union aracıyla
ölçüldü. Eski iki koleksiyon rotasının yerini alan `/workspace`, bir toplu
Ledger ve bir toplu Plan sorgusu yapar; üye, üst Defter veya kart başına ek
istek üretmez.

| Metric | V2 final | Evolution final | Change |
| --- | ---: | ---: | ---: |
| Ledger/Plan list request formula | `2` | `2` | flat, `L` ve `P`'den bağımsız |
| Overview request formula | `1` | `1` | flat |
| Collection first-load JS | 216,427 B (`/ledgers`) | 216,364 B (`/workspace`) | -63 B |
| Global CSS | 108,568 B | 115,559 B | +6,991 B |
| Client TSX | 41 / 94 | 40 / 98 | -1 boundary / +4 files |

CSS artışı ödeme onay yüzeyi, birleşik responsive grid ve fiziksel Defter kapağı
kurallarından gelir. Workspace kart sıralaması normal CSS Grid ve DOM akışını
korur; masonry/column yeniden sıralaması yoktur. Header tek pasif scroll
listener'ını `requestAnimationFrame` ile sınırlar ve yalnız bir CSS custom
property yazar; React state/render döngüsü oluşturmaz. Reduced-motion ve kapalı
adaptive-header tercihleri progress değerini sıfırlar.
