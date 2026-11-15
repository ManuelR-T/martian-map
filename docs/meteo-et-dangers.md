# Marswalk Planner: weather and dangers

Control of November 14, 2026. Proposed extension to the perimeter, without implementation of the interface.

## Recommendation for 48 hours

Add a MEDA historical conditions panel, a calculated slope alert and a scripted event that forces a review of the mission. Explicitly distinguish between “measured”, “calculated” and “simulated”.

| Feature | Data | Status and limit |
| --- | --- | --- |
| Temperature and pressure over a chosen soil | MEDA, Perseverance | 500 soil products accessible, CSV extracts and XML labels downloaded and decoded. Rover measurements, not a weather map at each point of the route. |
| Wind and direction | MEDA Archives | Released from floor 36 to floor 315 only, then sensor damaged ([MEDA](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/document/meda_release_notes.txt) release notes). Sol 500 only has raw files: displayed "unpublished". Details below. |
| Slope exceeding a chosen limit | HiRISE 4 m and CTX 20 m slope grids ([relief-jezero.md](relief-jezero.md)) | Average slope on 3 × 3 meshes; threshold of the scenario, not validated limit of a space suit. Small obstacles remain unresolved. |
| Areas to examine: dunes, boulders, escarpments | HiRISE imaging already available | Sourced manual annotation possible. An image does not measure the bearing capacity of the ground and is not sufficient to certify a danger. |
| Delay and insufficient return reserve | Mission calculator | Recalculation of times from parameters; no additional data. |
| Dust, reduced visibility | MEDA RDS/SkyCam documented, or explicit scenario | No visibility series or meter conversion rule has been validated. For the demo, simulated event with impact configured over time. |
| Radiative alert | Curiosity RAD for scientific context | Measurements at Gale, not at the Jezero site. Use a record or simulated event, not a calculated personal dose or a measured local map. |

## Concrete verification MEDA

[PDS Portal MEDA](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html) · [README of bundle](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/readme.txt).

- [Temperatures, ground 500](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_calibrated_env/sol_0420_0539/sol_0500/WE__0500___________CAL_ATS_________________P01.CSV): HTTP 206, 65,536 bytes read out of 2,518,142; HTTP 200 XML label. SCLK, LMST, LTST fields and five local temperatures in kelvins, at different positions on the rover.
- [Pressure, ground 500](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/sol_0420_0539/sol_0500/WE__0500___________DER_PS__________________P01.CSV): HTTP 206, 65,536 bytes read out of 1,687,719; XML label HTTP 200. Pressure in pascals, timestamps and transducer.
- The first 100 complete lines of each, the two labels and a manifest are kept in `data/research/meda/`. These are access samples, not a full day cleaned or a validated weather summary.
- For the future interface: download the complete CSV of the selected soil, consult the quality notes, manage absent/invalid values, explicitly choose the thermal sensor, convert K into °C and keep Martian time. Do not automatically average all five sensors.
- An anomaly of the inspected pressure label attributes the unit `kelvin` to the uncertainty field, while the pressure itself is correctly described in `pascal`. This field is empty in the first record; do not exploit it as validated uncertainty without clarification.
- The README reports measurement gaps and quality restrictions. An empty derived column should not be arbitrarily replaced by a calibrated value. The archives consulted do not constitute a forecast API or a guarantee of real time.

## Wind MEDA (#27)

PDS archive inventory, verified on 2026-11-15:

- **Products:** `CAL_WS` (calibrated, one value per mast) and `DER_WS` (derived, a single speed and direction, the best mast retained, filtered spurious data). Versions `P01`, and `P02` for reprocessed floors (310 to 315 for example).
- **Period:** from sol 36 (before, the sensor was in adjustment) to sol 315. Afterwards, the [release notes](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/document/meda_release_notes.txt) indicate that the sensor was damaged by the weather and that a recalibration is in progress; this is still the case in delivery 16 (sols 1740 to 1859). Files checked one by one around floor 315, then every 15th floor up to floor 1845.
- **`DER_WS` columns:** `HORIZONTAL_WIND_SPEED` in m/s, `VERTICAL_WIND_SPEED` in m/s (ground voids 300), `WIND_DIRECTION` in degrees clockwise from north, uncertainties (ground voids 300), `BOTH_BOOMS_USED_FOR_RETRIEVAL` (one or two masts), `ROVER_STILL` (0 = rover in motion). The invalid value is `999999999` (9 digits), different from the `9999999999` sentinel in the README.
- **Quality:** the README dismisses the wind before the ground 36. The release notes report that all data from a mast (including speed) is false when the wind goes out of its measurement range; `DER_WS` retains the best mast.
- **Choice:** the conditions displayed remain those of soil 500 (#23). Between sols 36 and 315, the rover is never in the Jezero sector of the application (closest to 1.8 km, sol 200); it enters ground 409. No other ground is substituted: the wind is displayed "unpublished", with the link to the version notes.
- **Raw files:** the ground 500 still has `ESD_WS1` and `ESD_WS2` in `data_raw_env`: the sensor records, but these are electrical counts without speed or direction, not calibrated since the damage.
- **Safeguard:** the preparation checks that the calibrated and derived files of each prepared soil do not contain any wind files, and stops otherwise. No danger of walking is derived from the wind.

## Scenario display and rules

Show ground, Martian time, measurement position and historical status. The effect on running time, temperature limits and reserves are simulation parameters; their calibration for an astronaut has not been established.

Demonstration example: the player prepares three saves; a “reduced visibility – simulated” event applies a chosen slowdown; the budget becomes insufficient; removing a stop restores the margin. The slowdown factor is a stated assumption.

MEDA RDS measures optical/UV radiation and dust: it is not the RAD ionizing radiation dosimeter. [Description PDS](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html). For the RAD context: [NASA, radiation measurements](https://science.nasa.gov/resource/radiation-measurements-on-mars/) and [solar event observed in May 2024](https://science.nasa.gov/resource/curiosity-sees-specks-caused-by-2024-solar-storm-while-recording-a-wind-gust-on-mars/).
