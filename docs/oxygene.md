# Oxygen estimate (model v1)

The estimate is always offered, with the simulated values of the default model. This model simulates a teaching scenario,
with no human calibration and no spacesuit sizing. All initial values
are **simulated**. The rover archives provide the terrain, never
a measurement of human consumption. System leaks and losses are excluded.

For walking:

```
q = q0 × [1 + kv (v/v0 − 1)²]
       × [1 + kup max(0, tan θ) + kdown max(0, −tan θ)]
       × (1 + km m)
consumption (g) = sum(q (g/min) × duration (min))
```

`v` and `v0` are in m/s, `m` in kg, `km` in kg⁻¹; the other coefficients
are dimensionless. θ is a signed slope in degrees, between −90° and +90°
(exclusive). Coefficients and flow rates must be finite and non-negative,
speeds strictly positive. No physiological range is validated.
The speed factor is lowest at the reference speed; since duration
also varies with speed, the total need is not monotonic in speed.

Each segment of the camp → stops → camp route is sampled at the resolution
of the available DEM. Slopes use the elevation difference in the walking
direction: the return leg is counted once, with its own cost. The mission
profile is computed independently of the demonstration route of the terrain panel.
Durations use horizontal Mars distances, like the time
budget. Stationary activities have their own constant flow rate; checked
activities remain included in the full-plan budget.

Without a DEM, outside coverage or with NoData, the result is unavailable.
The explicit "flat terrain" option ignores terrain along the whole route and stays
visible in the result. Remaining stock = initial stock − total need;
margin = remaining stock − protected reserve. A negative margin triggers an alert.

Parameters are stored in the optional `parameters.oxygen` extension
of schema v1 missions, with `modelVersion: 1`. Older saves remain
valid and use the default O₂ parameters when these are missing. The local save keeps only the
model fields, with no grid or terrain cache. The time budget remains independent.
