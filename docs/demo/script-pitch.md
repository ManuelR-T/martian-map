# Pitch script (#17)

About 3 minutes, one part per slide. The jury is not expert: explain every technical term.

## 1. Marps

- Team Yarnify3D
- Challenge: "Interplanetary Survival Guide: Martian Map"
- Marps: a tablet map to plan and follow a walk on Mars

## 2. Context

- Decades of NASA robots on Mars: orbiters and rovers
- Result: surface mapped, environment measured
- What the first astronauts need: a precise map for each walk (where to go, slopes, what to collect)
- Problem 1: data spread across many missions
- Problem 2: today's tools (e.g. NASA's Mars Trek) explore Mars, they do not plan a 1 km walk (stops, timing, way back)
- Problem 3: Houston (NASA's mission control) is too far, up to 22 min per message, so it can only advise with a delay

## 3. How a walk goes, and what Marps does

- The crew lives in a base: the habitat
- The walk: 2 astronauts outside, on foot, for a few hours, to study and collect rocks
- Marps' role: 1 astronaut inside becomes the control tower for the walkers
- Already tested by NASA (BASALT field tests): 2 outside, 1 inside who guides
- The day before: planning in Marps (camp, stops, tasks, climbs)
- During the walk: each task reported by radio, checked off on the tablet
- No network needed once the app is installed (Jezero sector and mission)

## 4. One NASA dataset per crew question

- "Where am I going?": images from orbit, 1 pixel = 25 cm (HiRISE camera)
- "Does it climb?": elevation and slopes from USGS (US Geological Survey)
- "Rock or loose sand?": night infrared, rock stays warm at night (THEMIS camera, about 100 m per pixel)
- "Which rock unit?": USGS geologic map
- "What did the rover find?": samples from the Perseverance rover
- "How cold is it?": Perseverance weather station

## 5. The day before: know each stop

- For each stop: what to bring back + the rover's photo
- Route profile: slopes above a crew-chosen threshold (10° here) flagged on the map
- Temperature measured by the rover (−44 °C at local noon, sol 500, July 2022): helps choose the time to go out

## 6. During the walk: calling the crew back

- Tracking: tasks checked off as they are reported by radio
- Alert: immediate return ordered from the habitat
- Way back given by Marps: straight line to camp, 610 m, about 21 min, tasks left behind
- In the demo, the radiation alert is simulated (no radiation measurement at Jezero)

## 7. Conclusion

- Every source and assumption labelled: measured, calculated, simulated or unknown
- Missing data shown, never invented
- Next: live position of the walkers, a real helmet display (simulated today), Gale, Utopia and Elysium (already marked, data to add), the Moon (Artemis missions)
- Try it at marps.vercel.app

**Optional demo (1 min, after slide 3):** open Jezero → route profile → touch a red section → "On a mission" → "Simulate radiation alert".

## Likely questions

- **Why is the tablet inside the habitat?** Pressurized gloves make a touchscreen almost unusable outside, so radio outside and tablet inside
- **Is the route safe?** No: relief measured every 4 m, without every rock or ground strength, so the route is a hypothesis
- **Are the durations realistic?** Walk length based on Apollo 17 (about 7 h, stops of 30 to 66 min); stop times, reserve and 0.5 m/s speed are our assumptions
- **Does infrared give temperature or firmness?** Neither: only rock versus fine sand, about 100 m per pixel, no number
- **Why 1 km?** Suit, oxygen and the way back limit range; Artemis III stays within 2 km of the lander; our demo walk is 1.3 km
- **Why 10°?** A threshold the crew can change, not a validated suit limit
- **Has radiation been measured on Mars?** Yes, by RAD on Curiosity at Gale crater (about 0.2 mGy per day), never at Jezero, hence the simulated alert
- **Is the data live?** No: NASA and USGS data frozen in the repository, each with its source ([credits-donnees.md](credits-donnees.md))
