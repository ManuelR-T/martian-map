# Issue #14 self-review

Reviewed on 2026-11-15 against the six acceptance criteria in
[#14](https://github.com/ManuelR-T/martian-map/issues/14).
Implementation: [PR #69](https://github.com/ManuelR-T/martian-map/pull/69).
This is a self-review of a deterministic full-plan budget, not a validation of
human EVA performance or of a safe return route.

## Acceptance evidence

| Criterion | Implementation | Evidence |
| --- | --- | --- |
| Walking = 60 × total km / km/h; sum activity minutes | `mission-core/src/budget.ts` explicitly converts m/s and seconds to km/h and minutes | `budget.test.ts` checks analytic distances, conversions and activity totals |
| Available time minus total walking, activities and reserve; return once | Walking uses `missionDistances().total`; return is a separate subtotal | Engine tests check exploration + return = total and the exact margin |
| Separate walking, observations, return, reserve and margin with units | `BudgetPanel.tsx` and `budgetView.ts` show exploration and return as non-overlapping chart parts, plus total walking | Panel demo checks values and units; FR/EN test checks labels, decimal formatting and alerts |
| Recalculate after camp, route, order, activity or parameter changes | Calculation derives from the current preparation or independent running snapshot | Engine and panel tests exercise changed camp, reordered/removed stops, added/changed/removed activities and live parameter edits |
| Text/visual negative-margin alert; distinct missing input state | `BudgetBreakdown` uses alert role, text, icon and color; invalid and missing inputs do not show the previous budget | Panel tests cover negative/zero/tiny margins, missing camp/stop/outing, empty fields and zero speed |
| Reproducible demo and edge cases | Jezero Alpha and manifest site positions; full-precision calculations until display | Demo margins +32.3, −17.7 and +27.3 min; total walking 42.7 min, including a 3.1 min return |

All six criteria are implemented. The issue remains open while PR #69 is open;
implementation and GitHub closure are separate states.

## Findings addressed

1. **Blocking integration drift.** The feature branch predated the bilingual UI
   and geological layer on dev. It has been rebased onto dev, preserving both
   and the subsequent manifest-driven region catalogue from #31.
   Conflicts in the app, budget, assumptions and English documentation were
   resolved without reintroducing the empty budget placeholder.
2. **Blocking activity hit target.** A title button used an absolute pseudo-element
   across the whole step, including interactive activity descriptions. The earlier
   z-index workaround remained only in the unmerged PR and left that structure
   fragile. The overlay is now removed: only the title is a button, with a minimum
   44 CSS-pixel height; activity labels and inputs remain independent native controls.
3. **Bilingual budget regression.** New labels and formatted numbers were French
   only, and the panel relied on its parent to rerender after a language change.
   The budget now subscribes to language changes, formats with the active locale,
   and uses matching French/English messages including interpolated overrun alerts.
4. **Overstated scientific justification.** The demo documentation described a
   75 min stop as validated by cited 30–66 min Apollo stops. The exact demo times
   are now explicitly scenario assumptions; analog research is supporting context.

## Interaction checks

Browser checks on localhost used actual pointer/keyboard interactions rather than
calling DOM `.click()` as a substitute for hit testing:

- At 1280 × 800, clicked an activity input, another activity's label, and toggled a
  focused activity with Space. Controls updated independently of site-title buttons.
- Switched French → English with a running mission; checked and unchecked activities,
  and verified translated budget labels and decimal separators.
- At 1024 × 768, clicked and keyboard-toggled a lower activity after scrolling.
- Reloaded and confirmed all three checked states persisted in the running outing.
- Ended the fully checked outing without a confirmation; the active record became
  null, history retained all three completed activities, and a further reload did not
  restore an active outing.

These are browser simulations, not tests on a physical tablet. The shared-control
unit test covers event independence; jsdom does not detect CSS hit-target overlap.

## Automated validation

`pnpm lint`, `pnpm typecheck`, `pnpm test` (403 tests in 45 files) and
`pnpm build` pass on the integrated branch. The production build still reports a
large main bundle (about 993 kB minified, 302 kB gzip); performance and initial
offline installation should be checked during #17/#24 acceptance.

## Preparation for follow-up issues

| Review priority | Follow-up | Recommended contract |
| --- | --- | --- |
| P1 | #17 full demo validation | Add a repeatable browser CI path that clicks inputs and labels, changes language, reloads and finishes a mission; retain desktop/tablet viewport checks. DOM tests alone missed the overlay defect. |
| P1 | #19 sampling delay / reduced visibility | Keep planned durations separate from scenario delays and measured elapsed time. Checkmarks are completion flags, not timestamps. Persist any new scenario state explicitly and keep preparation independent of the active outing. |
| P1 | #17 assumptions presentation | Replace the generic 10 min activity default with explicit type-specific scenario presets and provenance/uncertainty labels. Clarify whether available time is net field time; pauses, equipment setup and ingress/egress are not separate modeled terms. |
| P2 | #29 experimental terrain route; #44 cross-slope | Define a shared route/segment result before adding routing. The time engine currently measures direct horizontal camp–stops–camp segments; displaying a slope layer does not alter speed or establish traversability. |
| P2 | #32 oxygen; #33 walk-back limit | Add calibrated per-segment/per-crew resource models and explicit units/unknown states. A fixed time reserve is not an oxygen reserve; the planned last-stop return is not a live return from the current location. |
| P2 | #25 JSON/print export | Reuse the validated versioned mission and pure calculation, include source references and assumptions, and distinguish planned budget, tracking flags and outing lifecycle (an explicit end timestamp would help). Exclude rasters/tile caches. |

The current model deliberately sums sequential activity durations and does not
model parallel crew work, fatigue, terrain-dependent speed or live consumables.
No known blocking defect remains in the verified #14 scope; these follow-ups
require additional domain models rather than an arbitrary multiplier.
