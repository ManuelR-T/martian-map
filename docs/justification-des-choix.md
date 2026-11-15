# Why is the interface made like this?

Each choice responds to a concrete use of an astronaut on a trip to Mars and is based on a NASA or USGS source. What is a team hypothesis is stated as such. Each ticket manager adds their choices here.

## Common principles

- **The tablet is used in the habitat, not in a suit.** NASA considers the touch screen impractical with an exit glove: a touch screen attached to the forearm, tested on the space shuttle, was limited by reflections, its small size and fatigue ([NASA/TM-2012-217199](https://ntrs.nasa.gov/api/citations/20120011128/downloads/20120011128.pdf)). In output, “neither the mouse nor the touch screen are practical” ([NASA/TM-2013-216546](https://ntrs.nasa.gov/api/citations/20130014736/downloads/20130014736.pdf)). An exit glove reduces dexterity by 50%, then by an additional 30% once pressurized ([NASA NTRS, 1993](https://ntrs.nasa.gov/api/citations/19930016872/downloads/19930016872.pdf)). The tablet is therefore used to prepare for the exit, then for the teammate remaining in the habitat, who checks off the tasks that the astronaut announces on the radio. Outside, the voice (#40) or a headset view (#30) take over.
- **The crew decides alone on site.** A message takes 4 to 22 minutes between Mars and Earth. The NASA BASALT tests therefore give the crew a planning tool that can be consulted without the control center ([NASA NTRS](https://ntrs.nasa.gov/api/citations/20170002363/downloads/20170002363.pdf), [Astrobiology, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442304)). The application works with on-board data.
- **No GPS: we find our way with images and a heading.** “There is no GPS at the Red Planet”: Perseverance situates itself by comparing its panoramas to HiRISE images taken from orbit ([JPL, 2026](https://www.jpl.nasa.gov/news/nasas-perseverance-now-autonomously-pinpoints-its-location-on-mars/)). On the Moon, the Apollo rover displayed the distance and direction to return to the lunar module, using a gyroscope and wheel counters ([lunar rover manual, Apollo 17](https://apollojournals.org/alsj/LRVSysHndbkA17.pdf)). The application therefore shows visual cues and planned routes, never a live position.

## Site sheet (#9)

| Element | Use for the astronaut | Source |
| --- | --- | --- |
| Photo “To be spotted on site” | Recognize the target upon arrival, without GPS: drilling holes and abraded area of ​​the rover. Only photos whose NASA caption names the site are used. | [NASA Sample Catalog](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/) |
| To report | Know what sample the shutdown should bring back, and therefore when it is successful. Each stop of a NASA Marswalk simulation had a single scientific objective. | [BASALT, Beaton 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442237), [Desert RATS, NTRS](https://ntrs.nasa.gov/citations/20110008013) |
| Why | The question that the judgment helps to resolve. Without Earth to decide, the crew uses it to adapt their plan on the spot. Apollo 17 already started with one question per stop (Shorty crater: impact or volcano?). | [USGS PP 1080](https://pubs.usgs.gov/pp/1080/report.pdf), JPL articles ([2022](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/), [2023](https://www.jpl.nasa.gov/videos/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15/)) |
| Already done by the rover | Don't redo the rover's work and aim for what completes it. | NASA Sample Catalog |
| Checkable tasks | Follow the stop step by step, like the checklist on the wrists of the Apollo astronauts. The teammate in the habitat checks off what the astronaut announces. | [Apollo 16](https://pds-geosciences.wustl.edu/Lunar/urn-nasa-pds-apollodoc/document_a16/mission/a16_final_lunar_surface_procedures.pdf) Surface Procedures |
| Task content | Describe, photograph, then sample with before photo and identification photo: the geological documentation of Apollo. | [USGS, samples from Apollo 17](https://www.usgs.gov/publications/documentation-and-environment-apollo-17-samples) |
| Allocated time and “X min missing” alert | When time is short, choose what to skip. Apollo then omitted certain photos. | USGS, Apollo 17 samples |

**Team's choice, without NASA source:**
- The duration of each task (10 min to describe and for each series of photos, 45 min for sampling, 75 min in total): only the total of a stop is based on Apollo 17 and BASALT, the distribution is a choice of the team.
- The sheet fits without scrolling on a landscape tablet, with lines 44 px high: the teammate follows the output live, he does not have to search for the information. The photo enlarges with a touch.
- As long as the budget is not calculated, its panel stands on a line instead of being folded: folded, it would hide the remaining time once the budget is available, while tracking time is the central task of the teammate in the habitat.

**Deliberately left out:** the scientific detail and sources on the sheet. They don't help on site; the sources are grouped in the provenance panel (#16). Organic molecules are never presented as proof of life: JPL specifies that they can form without life.

## THEMIS night infrared (#22)

| Element | Use for the astronaut | Source |
| --- | --- | --- |
| “Night Infrared” layer on the Jezero map | Before leaving, identify large areas of loose soil and rocky outcrops on the route. At night, dust and fine sand cool quickly and appear dark; rock and hardened soils remain clear. | [USGS, THEMIS controlled mosaics](https://stac.astrogeology.usgs.gov/docs/data/mars/themis_controlled_mosaics/) |
| Caption “Dark: sand, dust” / “Light: rock, hard ground” | Read the image at a glance, without numbers. For MER rovers, NASA ruled out areas of low thermal inertia, dusty and low load-bearing. | [NASA Ames memo on sites MER](https://marsoweb.nas.nasa.gov/landingsites/mer2003/doc/original.html) |
| “Contrast, not a temperature. » | Don't take a gray as a measure. The USGS describes these mosaics as qualitative 8-bit products, stretched and melted for display. | USGS, THEMIS mosaics controlled |
| “Mars Odyssey · THEMIS · 100 m/pixel” and “Mosaic of 2018” | Knowing that the data is old and crude: a pixel is worth a piece of land measuring 100 m on a side, much more than the HiRISE details. | [WMTS Capabilities NASA Trek](https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml) |
| Tiles frozen throughout the HiRISE area | The layer works offline in the habitat, wherever the HiRISE map can be displayed. | Team data choice (4 tiles, approximately 220 KB) |

**Team's choice, without NASA source:**
- Transpose the rovers' lift criterion to an astronaut on foot: no NASA source found links night infrared to the preparation of a crew exit. The layer remains a context, never a “we go there/we don’t go there” criterion.
- Layer off by default and opacity at 60%: HiRISE remains the reference image, infrared is added to the request and lets you see the relief underneath.
- Switch and slider 44 px high, for use with your finger on a tablet.
- Switch stored in the “Layers” section of the Sector panel, under the legend and next to the Perseverance history: placed floating on the map, it passed under the Budget column from 1280 px and hid the Sector panel or the zoom on tablet.
- Display order: HiRISE, then night infrared, then the rover track, then the contours and sites, so that the infrared never hides a landmark.

**Deliberately excluded:** any numerical value (temperature, thermal inertia) and the layer on the global map of Mars, which is only used for orientation.

## Demo (#17)

The demo follows a complete outing, from preparation in the habitat to the decision to adapt the plan. Details and calculations: [demonstration mission](demo/mission-demo.md).

| Choice | Use for the astronaut | Source |
| --- | --- | --- |
| 6-hour field trip, 75-minute stops | Prepare for a real field day, not a shortened demo. A site sheet therefore has 75 minutes of tasks, and a stop can take up to 3 hours. | [Apollo 17](https://pds-geosciences.wustl.edu/Lunar/urn-nasa-pds-apollodoc/document_a17/mission/a17_final_lunar_surface_procedures_vol1_nominal.pdf): 7 hours per trip, stops 30 to 66 minutes; [BASALT](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442258/): 2 to 3 stops per 4-hour outing |
| Fixed reserve, withdrawn before margin | Leave time to return in case of the unexpected. | [Artemis III](https://ntrs.nasa.gov/citations/20230008183): a reserve is required for each exit |
| Overrun caused by added activity | See the effect of a decision before going out. In the field, tasks take longer than expected. | [Apollo 14](https://ntrs.nasa.gov/api/citations/20100036754/downloads/20100036754.pdf): +23% on tasks, exit exceeded by 30 min |
| Adaptation: skipping what the rover has already done | Keep the new objective and sacrifice the less useful one. | “Already done by the rover” sheet; [NASA catalog of samples](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/) |
| Camp within 490 m of each stop | Being able to return quickly in the event of a suit problem. | Artemis III: 2 km at most from the lander (lunar rule) |

**Choice of the team, without NASA source:** the 60 min reserve, the speed of 2 km/h, the position of the camp, 1 hour to leave and return, 50 min for the 2nd sample, and the distribution of a stop into tasks.

## Rover conditions (#23)

| Element | Use for the astronaut | Source |
| --- | --- | --- |
| Martian 24-hour temperature curve | Choose the exit time: on floor 500, the air goes from −82°C at 6 a.m. to approximately −39°C around 2 p.m. The cold and its large variations are among the main constraints of the Martian suit. | [NASA ICES 2026, PLSS Mars](https://ntrs.nasa.gov/api/citations/20260003024/downloads/Final_ICES2026_Mars_PLSS_Plan.pdf), [archive PDS MEDA](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html) |
| A single sensor, ATS1 on the mast | Do not read a temperature distorted by the heat of the rover: the ground 500, the sensors diverge up to 25 ° C during the day. The 1.45 m level is the cleanest. | [Munguira et al., 2023](https://meetingorganizer.copernicus.org/EGU23/EGU23-5885.html), CSV MEDA du sol 500 |
| Location: 2 m from Skinner Ridge | The measurement comes from one of the three stops: the rover remained stationary there from floor 477 to floor 501. | [NASA rover positions](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json) |
| “Past measurement, not a forecast” | Do not take an archive from July 2022 for the weather on the day of the release. | [README MEDA](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/readme.txt) |
| “Unavailable” time | Never fill a measurement hole: MEDA experiences gaps and invalid values. | README MEDA |

**Team's choice, without NASA source:**
- The median of each hour: it resists isolated peaks; MEDA only measures about 20 minutes per hour.
- The proposed opening time, 12 p.m.
- The pressure in a discreet line: the suit is pressurized whatever happens, it does not change any exit decision.
- The panel in the right column, under the site sheet: on the left, under the stages, the map already places its “Sector” panel (#20). The column scrolls so that no panel is crushed.
- Choose the time by touching or swiping the curve: an hour is only 11 to 17 px wide, too small to aim with your finger. The hourly menu remains available.

**Deliberately disregarded:** any temperature limit for the astronaut (none is validated), pressure uncertainty (empty column, wrong unit in the label).

## Wind to the rover (#27)

| Element | Use for the astronaut | Source |
| --- | --- | --- |
| “Unpublished wind after ground 315: damaged wind sensor. » | Knowing that the wind is unknown, rather than believing in calm weather. The displayed floor 500 only has raw counts, no speed or direction. | [MEDA](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/document/meda_release_notes.txt) Release Notes, Sol 500 PDS Files |

**Deliberately excluded:** the wind of an older soil. The rover was then at least 1.8 km from the area, and the temperature and pressure would come from another day. Any danger of walking caused by the wind: no scenario model defines it.

## Profile and slopes of the course (#15)

| Element | Use for the astronaut | Source |
| --- | --- | --- |
| Elevation profile of the route | Before leaving, see where the route goes up and down, to distribute the effort and time. The HiRISE relief at 4 m per box is used; the CTX at 20 m replaces it if the manifest declares HiRISE incomplete or unavailable (#10). | USGS HiRISE and CTX relief, see `docs/relief-jezero.md` |
| Highlighted steep sections | Allow more time, slow down or change path. On Apollo, a slope of around 15° in soft ground was "like climbing a dune", and the plans called for 1 minute of rest for every 5 minutes of climbing. | [LPSC 2025, Apollo](https://www.hou.usra.edu/meetings/lpsc2025/pdf/2023.pdf) |
| Holes in profile | A zone without measurement remains visible as such: the crew does not rely on an invented altitude. Light gray for a hole in the measurements, dark gray for a portion outside the covered area. | Team Pick |
| Steep passages on the map | The profile says *there* is a steep climb; the map shows *where*, and what is around to get around it. Same passages, same threshold as on the profile. | Team Pick |
| Profile point shown on map | On exit, the astronaut announces his position on the radio; the teammate in the habitat touches this point on the profile, sees it on the map and warns him of the next steep passage. | Team Pick |
| Shaded Emboss (off by default) | Highlights ridges and hollows that are poorly visible in the photo. Calculated from the same relief as the profile, so that map and profile never contradict each other. Disabled by default and at 50% opacity: once the steep passages on the map, it's context. Fictitious lighting coming from the northwest, visual aid and not measurement. | USGS HiRISE and CTX Relief (#10) |

**Team's choice, without NASA source:**
- **Threshold of 10° by default, adjustable from 5 to 25°:** beyond that, the climb is painful and you have to allow time and breaks. The future NASA suit must allow walking on slopes of up to 20° ([xEVA ConOps](https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf)). On Apollo 14, a climb of about 10° raised the heart rate to 150 beats per minute ([NASA SP-350](https://www.nasa.gov/wp-content/uploads/static/history/SP-350/ch-12-5.html)). 10° signals the effort well before this limit. No Mars-specific boundary exists.
- **One point per relief box** (4 m in HiRISE, 20 m in CTX): tighter points would invent details that the data does not have. Between two measured boxes, the altitude is interpolated; next to an empty box, the profile leaves a hole.
- **Calculation method.** Slope in degrees = arctangent (height difference ÷ ground distance) between two consecutive points. The distance to the ground is calculated on the sphere of Mars (radius 3,396,190 m), which takes into account the narrowing of the boxes towards the east at the latitude of Jezero. The interpolation between the 4 neighboring boxes slightly smoothes the relief; no further smoothing is applied.
- **The slope depends on the fineness of the relief and the method.** At Skinner Ridge, the maximum slope of the terrain, in all directions (Horn method on 3 × 3 squares, #10), is approximately 20° in HiRISE 4 m and 8° in CTX 20 m. The profile only measures the slope in the direction of travel, between two points 4 m apart: it is weaker. Along the demonstration route, the steepest slope is 14°: the threshold of 10° signals 10 passages, 15° would signal none.
- **Slope in the direction of travel only.** The cross slope, when following a slope, falls under ticket #44.

**Limits:** even at 4 m per square, the relief does not show rocks or small steps, and it does not guarantee that a passage is passable. The demonstration route connects the sites in a straight line while waiting for the route (#12); it is not a calculated path.

## Simulated radiation alert (#26)

The alert is used during the exit, in “On Mission” mode. The teammate remaining in the habitat reads the order on the tablet and transmits it over the radio.

| Element | Crew use | Source |
| --- | --- | --- |
| Order “Return to camp now” | Repeat actual decision: During a solar event, a sortie may be aborted and the crew taken to safety. NASA's Radiation Analysis Group (SRAG) advises on each exit and alerts controllers. | [SRAG, NASA JSC, 2000](https://lws.gsfc.nasa.gov/documents/community_ws_5_10_2000/golightly.pdf), [NASA OCHMO](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| Direct return from the current step | NASA judges a trip to be well protected if it can stop in less than 2 hours with accessible shelter. The alert gives the distance and duration of the straight line return to camp, at the planned mission speed. | NASA OCHMO |
| Discontinued activities, summarized by site | Know what the exit will not yield, to replan without waiting for Earth. | Team Pick |
| Mention “Simulation” and folded context | No radiation measurements exist at Jezero: RAD, on Curiosity, measures at Gale Crater, and MEDA RDS, on Perseverance, measures Sunlight and dust. The alert is therefore an exercise. | [NASA, 2013](https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/), [NASA, measurements RAD](https://science.nasa.gov/resource/radiation-measurements-on-mars/), [NASA, MEDA RDS](https://science.nasa.gov/resource/medas-radiation-and-dust-sensor/) |

**Team's choice, without NASA source:**
- The application does not know the position of the crew. The current step is the first step that still has an unchecked activity, or the last when everything is checked.
- Anything not checked, from the current step, is abandoned.
- The numbers are frozen when triggered, like an order transmitted on the radio. Going through “At base” keeps the alert; reloading the page cancels it.
- The remaining margin is not displayed until the time budget (#14) is calculated.

**Deliberately excluded:** any personal dose, probability of survival or local alert deduced from a terrestrial alert. The only figure cited, around 210 micrograys per day measured by RAD in Gale in 2012-2013, describes the location of the measurement.
