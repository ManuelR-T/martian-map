# Demo validation checklist (#17)

To unfold when #11, #12, #13, #14, #15 and #16 are merged. The expected values ​​come from [the demonstration mission](mission-demo.md). A checked box means “seen in the application”, not “expected”.

## Where to test

| Screen | Size | Why |
| --- | --- | --- |
| Production: <https://marps.vercel.app/> | 1920 × 1080 | Presentation screen, projected in front of the jury. |
| Production: <https://marps.vercel.app/> | 1024 × 768 | Tablet in landscape, intended use in the home. |
| Development: <https://martian-map-dev.vercel.app/> | Both sizes | Rehearsal before putting into production. |

## Demo walkthrough

| ✓ | Step | Expected |
| --- | --- | --- |
| [ ] | Open app | MOLA global map; The offline indicator tells you where the installation is. |
| [ ] | Enter Jezero | HiRISE imaging; limit of the visible mission sector; possible return to the global view. |
| [ ] | Exit the sector | “Imaging only” message; neither relief nor planning. |
| [ ] | Set up camp at 77.4095° E, 18.4513° N | Camp displayed as fictitious position. |
| [ ] | Add Skinner Ridge, Wildcat Ridge, Amalik | Same order on the map and in the list. |
| [ ] | Set 360 min, reserve 60 min, 2 km/h, 75 min stops | Distance 1,499 m (± 1 m); walk 45 mins; return 14 min displayed separately. |
| [ ] | Read the margin | +32 mins. |
| [ ] | Pass Amalik at 125 min (2nd collection) | Margin −18 min; alert in text and color. |
| [ ] | Pass Skinner Ridge 30 min | Margin +27 min; the alert disappears. |


## Controls

| ✓ | Control | Expected |
| --- | --- | --- |
| [ ] | Return counted once | Total walking = 45 min, steps 45 + 14. |
| [ ] | Synchronized map, list and profile | Reordering or deleting a stop updates all three without an outdated track. |
| [ ] | Elevation profile | Same relief across the entire route; gaps displayed, never filled in silence. |
| [ ] | Visible data | Source, resolution and date of each layer accessible; hypothetical marked path. |
| [ ] | Coverage Limits | Outside the sector, the application says it instead of inventing data. |
| [ ] | Credits | Complies with [credits-donnees.md](credits-donnees.md). |

## Network absent or slow

In the browser's developer tools, Network tab.

| ✓ | Location | Expected |
| --- | --- | --- |
| [ ] | Offline, after a first visit | Usable application and prepared area; clear message for areas not downloaded. |
| [ ] | Offline, first visit | Understandable error message, never a blank screen. |
| [ ] | Slow connection | Visible loading status; no blank screen without explanation. |
| [ ] | In any case | No text promises an offline cache beyond the prepared sector (#24). |

## Automatic tests

| ✓ | Element | Expected |
| --- | --- | --- |
| [ ] | Engine Unit Testing | `pnpm test` passes into the CI of each pull request. |
| [ ] | Critical Path Integration Tests | Added mission, overrun at −18 min, adaptation at +27 min, return counted once. They remain to be written after #12 and #14. The repository today only has Vitest, with no testing tool in a real browser. |

## Rescue video

| ✓ | Element | Expected |
| --- | --- | --- |
| [ ] | Save the route | Follow the [version of 30 s](script-pitch.md#30s-version-backup-video) in 1920 × 1080, on the production URL. |
| [ ] | Make video accessible | Public link off the Space Apps site, and an offline copy on the presentation computer. |
