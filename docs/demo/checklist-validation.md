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
| [ ] | Choose Jezero Alpha at 77.400° E, 18.450° N | Camp displayed as fictitious position. |
| [ ] | Add Skinner Ridge, Wildcat Ridge, Amalik | Same order on the map and in the list. |
| [ ] | Set 360 min, reserve 60 min, 0.5 m/s (1.8 km/h), activities totaling 75 min per stop | Distance 1,280 m (± 1 m); total walking 42.7 min; return 3.1 min displayed separately. |
| [ ] | Read the margin | +32.3 min. |
| [ ] | Add a 50 min sampling activity at Amalik | Activities 275 min; margin −17.7 min; alert in text and color. |
| [ ] | Remove the 45 min sampling activity at Skinner Ridge | Activities 230 min; margin +27.3 min; the alert disappears. |


## Controls

| ✓ | Control | Expected |
| --- | --- | --- |
| [ ] | Return counted once | Total walking = 42.7 min, including the 3.1 min return. |
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
| [ ] | Critical Path Integration Tests | `apps/web/src/panels/BudgetPanel.test.tsx` covers the demo, −17.7 min overrun, +27.3 min adaptation, invalid inputs, recalculation and preparation/tracking separation. React tests run under jsdom; browser acceptance is a separate check. |

## Rescue video

| ✓ | Element | Expected |
| --- | --- | --- |
| [ ] | Save the route | Follow the [version of 30 s](script-pitch.md#30s-version-backup-video) in 1920 × 1080, on the production URL. |
| [ ] | Make video accessible | Public link off the Space Apps site, and an offline copy on the presentation computer. |
