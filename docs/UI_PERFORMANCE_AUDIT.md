# UI / Motion / Performance Audit

Audit date: 2026-08-28

## Findings before fixes

| Area                                      | Severity    | Problem                                                                                                                                                                    | Root cause                                                                                                                                 | Fix                                                                                   |
| ----------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Login / auth layout at 320, 375 and 390px | HIGH        | The document width was 429px, creating a horizontal scrollbar and clipping the right edge of the form card.                                                                | The grid item did not constrain its min-content contribution, while the centered inner card resolved to 390px inside a padded 390px panel. | Constrain the panel and card to the available grid track.                             |
| Public login runtime                      | LOW         | Browser console recorded one failed resource request.                                                                                                                      | `/favicon.ico` returned 404.                                                                                                               | Add the existing application icon as the root favicon.                                |
| Login at 768, 1024 and 1440px             | PASS        | No horizontal overflow.                                                                                                                                                    | N/A                                                                                                                                        | No change.                                                                            |
| Public login runtime                      | PASS        | No JavaScript exceptions, failed API calls, or hydration warnings observed.                                                                                                | N/A                                                                                                                                        | No change.                                                                            |
| Protected application routes              | NOT AUDITED | Overview, Workspace, details, Analytics, dialogs, FAB, and adaptive-header scroll states require an authenticated user session that was not supplied to the browser audit. | No test-session authority was available.                                                                                                   | Do not infer a visual PASS; retain existing implementation and report the limitation. |

## Measurement baseline

- Public runtime viewports exercised: 320x700, 375x812, 390x844, 768x1024, 1024x768, 1440x900.
- Login document width before fix: 429px at 320/375/390px viewports.
- Emitted global CSS: 98,661 bytes (96.3 KiB).
- Public login resource failures before fix: one (`/favicon.ico`, 404).

## Motion and runtime review

- The existing adaptive header keeps its passive scroll listener, requestAnimationFrame scheduling, and CSS custom-property path. It was not changed during this pre-fix audit because protected-page runtime evidence was unavailable.
- No React state update per scroll frame was identified in the shared header implementation.
- The login surface uses transform/opacity entrance motion; no runtime animation regression was observed there.
