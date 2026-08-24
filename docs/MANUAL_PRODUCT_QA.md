# Defterdar Manual Product QA

> **Status: MANUAL QA NOT YET EXECUTED**

This checklist is the release-candidate device and assistive-technology pass.
Automated tests and source review do not mark any item below as complete.

## Test setup

- Use a production build with a fresh user and a seeded multi-user account.
- Cover viewport widths `320`, `375`, `390`, `768`, `820`, `1100`, and a
  desktop width of at least `1440` pixels.
- At each width, record browser/device, operating system, account, result,
  screenshot or video reference, and defect ID.
- Repeat destructive or financial scenarios with isolated test data.

## Product scenarios

- [ ] Register: validation, password reveal, submit, PERSONAL Ledger creation.
- [ ] Onboarding: all three steps, back/forward, skip, first-action links.
- [ ] PERSONAL Expense: default payer/participants, EQUAL split, save and edit.
- [ ] Shared Ledger: create, General, Activity, Balance, Analytics and Settings.
- [ ] Invite: create/copy/revoke, accept as another user, expired/error states.
- [ ] Plan: create, participants, lifecycle, move/archive and Plan-scoped return.
- [ ] Expense EQUAL: deterministic remainder and preview match saved result.
- [ ] Expense EXACT: validation and saved allocations.
- [ ] Expense PERCENTAGE: total validation and saved allocations.
- [ ] Expense SHARES: ratio validation and saved allocations.
- [ ] Balance: payer/payee direction, zero state and post-mutation freshness.
- [ ] Settlement: partial/full payment, void and updated balances.
- [ ] Borçtan düş: eligibility on demand, before/after summary, create and void.
- [ ] Analytics: range changes, Ledger/Plan scope and empty states.
- [ ] Settings: profile and Ledger-scoped category create/edit/archive.
- [ ] Receipt: upload progress, READY state, open signed URL, delete and errors.

## Accessibility

- [ ] Keyboard-only: reach every action in meaningful order without a trap.
- [ ] VoiceOver: headings, landmarks, names, states and financial direction.
- [ ] 200% zoom: no clipped task, hidden action or two-dimensional scrolling.
- [ ] Reduced motion: onboarding/dialog/loading behavior remains understandable.
- [ ] Focus: indicator remains visible on light, dark and destructive surfaces.
- [ ] Dialogs: initial focus, containment, Escape, background inertness and
      trigger focus restoration; destructive dialogs start on the safe action.
- [ ] Touch: critical targets remain at least `44 × 44` CSS pixels and clear of
      browser chrome, notches and virtual keyboards.

## Performance and resilience

- [ ] Slow network: auth, list, detail and mutation states never look completed
      early; abandoned view requests do not surface stale errors.
- [ ] Overview with many Ledgers/Plans: first useful render stays one aggregate
      request and sections remain responsive.
- [ ] Large-group Expense detail: no page-load availability fan-out; opening one
      Borçtan düş action requests only that split's eligibility.
- [ ] Long Activity: pagination remains usable and mounted history stays capped
      at five pages / 100 rows.

## Completion gate

Manual QA may be marked executed only when every row has evidence or a linked
accepted defect. The next sequence is `USER MANUAL QA → bugfix checkpoint →
release candidate`.
