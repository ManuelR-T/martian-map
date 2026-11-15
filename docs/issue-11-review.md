# Checking outcome 11

Local review from November 15, 2026, branch `feat/11-mission-camps-activities`.
Reference: https://github.com/ManuelR-T/martian-map/issues/11

The six acceptance criteria are covered after the corrections in this review.
No known blocking faults within the verified scope. The GitHub ticket does not have
been modified or closed; changes remain local.

## Criteria and evidence

| Criterion | Implementation | Verification |
| --- | --- | --- |
| Versioned types: region, fictional camp, stages, geometry, activities, settings, assumptions | `packages/mission-core/src/mission.ts`: public types, envelope `schemaVersion: 1`, validation of backups; geometry derived from steps to avoid stale geometry | `mission.test.ts`, `missionDatabase.test.ts`: unknown versions denied, JSON round trip, migrations and visit order |
| Camp, free stages/catalogue, deletion and reorganization | Independent management of camps; selection in the mission; step editor and pure reducer | `mission.test.ts`, `planner.test.ts`, `baseWorkflow.test.tsx`: addition, deletion, order, catalog, preparation and backup |
| Photo/observation/sampling activities and duration in minutes | `MissionActivity`, `ActivityEditor`, separate monitoring of visits | Tests for independent activities, fractional durations, checkmarks and refusal of invalid durations |
| Duration, speed, reserve, units and validation | Seconds in the model for the budget, minutes in the forms, speed in m/s; `validParameters` checked in save and in reducer | Tests for negative values, NaN, infinity, zero speed and excess reserve; form parameters preserved on rollback |
| useReducer + Context, testable transitions without React | `PlannerProvider.tsx`, `planner.ts`, `missionReducer` DOM independent | Unit Testing of Transitions and User Journey DOM Testing |
| Separate measurements of simulation; detailed edition limited to Jezero | Scientific sites referenced by identifier/contact details; explicitly fictional camps and hypotheses; `missionMatchesCatalog` protects adding, opening and starting | Tests for refusal of unknown sites and preparations restored outside the sector; pure engine tested with another region |

## Defects fixed during review

- The settings entered in the last step were lost when backtracking.
Their draft is now preserved and tested.
- Changing between At Base and On Mission dismantled the form and lost its
stage. The preparation remains mounted and masked during monitoring.
- The first backup could keep the generic identifier `draft`, and
continue after a save did not clearly offer a new
assignment. A unique identity and actions Prepare another mission /
Create another template are now available.
- The boundaries of the sector and the consistency of the sites were checked when adding
but can be bypassed by loading a save. Opening and starting
now also check these constraints.
- Restore tracking rewrote its history date without user change.
Restoring no longer triggers an unnecessary automatic backup.
- A failed restore was treated as an empty trace ready to replace.
The startup now remains stuck and a retry action is
proposed. Responses from replaced uploads are ignored.
- Card transitions accepted an unknown task or duration
invalid allocation. The file reducer now also refuses them.
- On small screens, the links of the two spaces disappeared with the
banner navigation. They remain accessible in compact settings.

## Checks executed

- `pnpm lint`: success.
- `pnpm typecheck`: success.
- `pnpm test`: 216 tests passed in 18 files, including DOM regressions,
the pure model, the simulated IndexedDB database and the migrations.
- `pnpm build`: success.
- `git diff --check`: success.

The build reports a JavaScript bundle greater than the guideline threshold of 500 kB;
this does not block compilation. DOM controls use jsdom and
fake-indexeddb: this review does not constitute visual validation in a
real browser nor a test on a tablet or astronaut equipment.

The complete calculation of the budget falls under issue 14. Storage remains local to
the device, without multi-crew synchronization. The example camps are
fictitious and the route in direct segments does not validate the passability of the terrain.
