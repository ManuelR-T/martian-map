# Demonstration mission (#17)

A 6-hour outing around three Perseverance sites. The plan holds, then an added activity causes the budget to exceed the budget, and an adaptation restores the margin. During the exit, a simulated radiation alert orders the return to camp. The mission is prepared in PR #50 (“At Base” and “On Mission” modes). The total durations come from real missions (Apollo and NASA BASALT tests). The division of a stop into tasks is a hypothesis of the team.

## Settings

| Parameter | Value | Why |
| --- | --- | --- |
| Field Time | 360 mins (6 hrs) | Apollo 17 planned 7 hours per exit, from open airlock to closed airlock. We take 1 hour off to leave and return. This is optimistic: Artemis III has around 1.5 to 2 hours of additional time per outing (suit preparation, exit, installation, dusting, re-entry), including up to 30 min of dusting before returning. |
| Reserve | 60 mins | Artemis III requires a reserve for each outing, without giving the duration. 60 min is a team choice. |
| Walking speed | 0.5 m/s (1.8 km/h) | Application default. The team's hypothesis: no open source gives a walking speed in a suit on Mars. |
| Camp | “Jezero Alpha — simulation”, 77.400° E, 18.450° N | Fictitious camp from the application catalog. Each stop is less than 640 m from camp; Artemis III limits 2 km from the lander. |
| Duration of a stop | 75 mins | Apollo 17 planned stops of 30 to 66 minutes. BASALT made 2 to 3 stops per 4-hour outing. 75 min remains in this range. |

## Course

Straight segments on the Martian sphere with radius 3,396,190 m. This route is hypothetical: it is not a path verified in the field.

| Journey | Distance | Walks at 0.5 m/s |
| --- | --- | --- |
| Camp → Skinner Ridge | 633.1 m | 21.1 mins |
| Skinner Ridge → Wildcat Ridge | 23.7m | 0.8 mins |
| Wildcat Ridge → Amalik | 531.4 m | 17.7 mins |
| Amalik → camp (return) | 91.7m | 3.1 mins |
| **Total** | **1,280.0 m** | **42.7 mins** |

The return is displayed separately but counted only once in the walk.

## Unfolded

Margin = field time − on − stops − reserve.

| Step | What the crew does | Stops | Margin |
| --- | --- | --- | --- |
| 1. Global view, then Jezero | Locate the area and see where detailed data exists. | | |
| 2. Camp and three stops | “At Base”, new mission “Sample Collection”: Camp Jezero Alpha, then Skinner Ridge, Wildcat Ridge and Amalik in that order. | 75 + 75 + 75 = 225 mins | 360 − 42.7 − 225 − 60 = **+32 min** |
| 3. Additional activity | Add a 2nd sample from Amalik, the clayey rock considered most capable of retaining organic molecules: +50 min, the duration of the BASALT sampling phase. | 75 + 75 + 125 = 275 mins | 360 − 42.7 − 275 − 60 = **−18 min**, overrun alert |
| 4. Adaptation | Reduce Skinner Ridge to 30 min: remove sample, keep observation and photos. The rover has already made 2 cores there, and the site is 24 m from Wildcat Ridge. | 30 + 75 + 125 = 230 mins | 360 − 42.7 − 230 − 60 = **+27 min** |
| 5. Exit | Save, then “Start this mission”. In “On Mission” mode, check off Skinner Ridge activities. | | |
| 6. Delisting alert | “Simulate a radiation alert” at Wildcat Ridge: return from 610 m in 21 min at 0.5 m/s. Abandoned: Wildcat Ridge (3 activities) and Amalik (4 activities). | | |

Exact values: walk 42.67 min, margins +32.33, −17.67 and +27.33 min. The margins will be displayed by the application when the time budget (#14) is merged; until then, they come from this calculation.

## Why this scenario is realistic

- **Tasks are taking longer than expected.** On Apollo 14, they took 23% longer than planned and the first exit exceeded by about 30 min. The crew caught up by reducing their travel. He considered a margin of 25 to 30% on each task desirable.
- **In the field, it's slower than in training.** Tasks took about 40% longer on Apollo 15 and 70% longer on Apollo 16. A single double core took 6.7-7.2 min on Apollo 15.
- **Adapting means choosing what to skip.** For Artemis III, the objectives have a priority set in advance. Here, we sacrifice the sampling that the rover has already made, not the new objective.

## Team hypotheses

- The distribution of a 75 min stop into tasks. Only total downtimes are sourced.
- The field time of 360 min, with 1 hour to exit and return (optimistic compared to the 1.5 to 2 hours of Artemis III), the reserve of 60 min, the speed of 2 km/h and the position of the camp.
- The 50 min of the 2nd sampling: this is an entire phase of BASALT, not a measurement taken on this site.
- Lunar sources and tests on Earth are transposed to Mars by analogy.

**In the application (PR #50):**
- In step 3 of preparation, enter 360 min of available time and 60 min of reserve. The speed remains at 0.5 m/s.
- Each stop has 75 minutes of activities: observation 10 minutes, photo 20 minutes, sampling 45 minutes. The 2nd Amalik sample lasts 50 min. Reduced Skinner Ridge guard observation and photo (30 min).
- Prepare and record the mission before the presentation. Live, we only add the 2nd sample, then we adapt Skinner Ridge.

## Sources

| Source | What we get from it | Location |
| --- | --- | --- |
| [Apollo 17 Surface Procedures, Volume 1](https://pds-geosciences.wustl.edu/Lunar/urn-nasa-pds-apollodoc/document_a17/mission/a17_final_lunar_surface_procedures_vol1_nominal.pdf) | 7 hours per outing; stops planned from 30 to 66 min | PDF p. 19; stops p. 107, 168, 176, 229, 241 and 249 |
| [Article BASALT, Astrobiology 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442258/) | 4 hour outing; 2 to 3 stops; phases: identification 10 min, research 1 hour, examination 1 hour, sampling 50 min | Section 1.2 |
| [Marquez, Apollo 14](https://ntrs.nasa.gov/api/citations/20100036754/downloads/20100036754.pdf) | +23% on tasks; exceeded 30 min; margin of 25 to 30% desired | PDF p. 5, 7 and 9 |
| [Apollo 15 Time and Motion Study](https://ntrs.nasa.gov/api/citations/19730008096/downloads/19730008096.pdf) | +40% compared to training; double coring in 6.7 to 7.2 min | PDF p. 7; table 5, PDF p. 35 |
| [Apollo 16 Time and Motion Study](https://ntrs.nasa.gov/api/citations/19730008098/downloads/19730008098.pdf) | +70% compared to training | PDF p. 7 |
| [Tenets of Lunar EVAs for Artemis III](https://ntrs.nasa.gov/citations/20230008183) | Reserve required for each outing; 2 km at most from the lander; objectives classified by priority; 1.5 to 2 hours of additional time per outing, including a maximum of 30 minutes of dusting | Points 1, 4, 5, 6 and 7 |
| [Sampling points NASA](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json) | Contact details of the three stops | `outcrop_name` |
| [NASA Sample Catalog](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/) | 2 cores already taken by the rover at Skinner Ridge (Swift Run and Skyland) | 2022 Samples |
