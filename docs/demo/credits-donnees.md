# Data, resources and tools (#17)

Every dataset, text source and tool used by Marps, with its credit and terms of
use. Dataset credits are copied from `apps/web/public/data/manifest.json`,
`apps/web/public/atlas/manifest.json` and `packages/data/src/siteSheets.ts`.
Using this data does not imply any endorsement of this project by NASA, ESA,
USGS or the other providers.

## NASA data

| Data | Credit | Terms of use |
| --- | --- | --- |
| MOLA colorized relief, global map (463 m/pixel) | NASA / MGS MOLA science team; distributed by NASA Mars Trek | NASA content may be reused without prior permission for factual purposes, without implying endorsement; cite NASA as the source ([NASA rules](https://www.nasa.gov/nasa-brand-center/images-and-media/)). |
| Jezero HiRISE mosaic (0.25 m/pixel) | NASA/JPL-Caltech/University of Arizona; distributed by NASA Mars Trek | HiRISE images are in the public domain, with credit requested ([HiRISE policy](https://uahirise.org/media/usage.php)). Terms specific to the Trek mosaic are not confirmed. |
| THEMIS night-time infrared, Jezero | NASA/JPL-Caltech/Arizona State University; USGS mosaic; distributed by NASA Mars Trek | Terms specific to this product are not confirmed; the source is cited. |
| HiRISE elevation, slope and hillshade (4 m/pixel) | USGS Astrogeology Science Center; NASA/JPL-Caltech/University of Arizona, Mars 2020 Terrain Relative Navigation HiRISE DTM Mosaic | No access constraints; cite Fergason et al., 2020 ([USGS page](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic)). |
| CTX elevation, slope and hillshade (20 m/pixel) | USGS Astrogeology Science Center; NASA/JPL, Mars 2020 Terrain Relative Navigation CTX DTM | No access constraints; cite Fergason et al., 2020 ([USGS page](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic)). |
| Perseverance sampling sites: Skinner Ridge, Wildcat Ridge, Amalik | NASA/JPL-Caltech, Mars 2020 Perseverance sampling map (mars.nasa.gov) | Same NASA rules as the MOLA relief. |
| Perseverance waypoints and traverse | NASA/JPL-Caltech (mars.nasa.gov MMGIS layers) | Same NASA rules as the MOLA relief. |
| Site photos (sols 495, 516 and 575) | NASA/JPL-Caltech; [NASA sample catalog](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/) | Same NASA rules as the MOLA relief. |
| MEDA air temperature and pressure, sol 500 | NASA/JPL-Caltech, CAB (CSIC-INTA), Perseverance MEDA instrument; PDS Atmospheres Node archive | Terms specific to this product are not confirmed; the source is cited. |
| TES thermal inertia (global atlas) | NASA MGS/TES, Arizona State University; Christensen et al. (2001) | Terms specific to this product are not confirmed; the source is cited. |
| Radiation context (RAD on Curiosity, MEDA RDS) | NASA articles linked in the radiation alert | Cited as text sources. |

## Space agency partner data

| Data | Credit | Terms of use |
| --- | --- | --- |
| HRSC global color mosaic (global atlas background) | ESA/DLR/FU Berlin, Mars Express HRSC | Preview image used as published, with credit. |
| MEDA instrument (see above) | Built by CAB (CSIC-INTA), Spain, for NASA's Perseverance | See MEDA above. |

## Other data

| Data | Credit | Terms of use |
| --- | --- | --- |
| Jezero geologic units | Sun, V. and Stack, K., 2020, *Geologic map of Jezero crater and the Nili Planum region, Mars*, USGS Scientific Investigations Map 3464, 1:75,000 | No access or use constraints; cite Sun and Stack (2020) ([USGS metadata](https://pubs.usgs.gov/sim/3464/sim3464_metadata.txt)). |
| Global geologic map (atlas) | Tanaka et al. (2014), USGS SIM 3292, 1:20,000,000; copy distributed by Esri StoryMaps | USGS publication; cite Tanaka et al. (2014). |
| Jezero terrain annotations | Marps team, texts drafted with AI assistance (Claude Code, Codex, Antigravity); visual interpretation of NASA/JPL-Caltech/University of Arizona HiRISE imagery | Team-made layer, labelled as an interpretation in the app. |
| Example camps, mission durations, characters of the demo scenario | Marps team | Fictional, labelled as such in the app. |

Site sheet texts are based on NASA JPL ([2022](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/), [2023](https://www.jpl.nasa.gov/videos/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15/)), the NASA sample catalog and [USGS on the Apollo 17 samples](https://www.usgs.gov/publications/documentation-and-environment-apollo-17-samples).

Reference to cite for the terrain models: Fergason, R. L. et al., 2020, *Mars 2020 Terrain Relative Navigation Flight Product Generation: Digital Terrain Model and Orthorectified Image Mosaics*, 51st Lunar and Planetary Science Conference ([PDF](https://www.hou.usra.edu/meetings/lpsc2020/pdf/2020.pdf)).

## Software, fonts and icons

All are open source and used under their licenses:

- **Application:** React, TypeScript, Vite, OpenLayers, Tailwind CSS, shadcn/ui and Radix UI, i18next, Lucide icons, class-variance-authority, clsx, tailwind-merge, tw-animate-css.
- **Fonts:** Public Sans and Archivo (SIL Open Font License), bundled through Fontsource.
- **Data preparation:** Python with uv, NumPy, Pillow, pyogrio, Shapely, tifffile and pytest.
- **Tests and hosting:** Vitest, ESLint, Playwright for browser checks, GitHub Actions and Vercel.

## AI tools

Claude Code (Anthropic), Codex (OpenAI) and Antigravity (Google) were used as
coding assistants. See "Use of AI tools" in the [README](../../README.md).
