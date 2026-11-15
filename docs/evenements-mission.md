# Simulated mission events

In the Budget panel, "Simulated events" adds a delay to an activity or reduces
the walking speed on chosen legs. The values are teaching assumptions: no local
visibility or weather alert is observed.

Delays add to the activity's initial duration without changing it. Visibility
factors multiply and apply to the initial speed over the whole selected leg,
detours included. A factor of 0.5 doubles the duration; two factors of 0.5 give
0.25 times the initial speed. The return is a separate leg that can be selected
and is counted once.

Each event stays active until it is cancelled. Calculations cover the full plan,
checked activities included: they do not measure elapsed time. Cancelling an
event removes only its effect; cancelling all of them restores the initial
budgets. The O₂ estimate uses the delayed durations, its stationary flow and the
modified walking speeds (its flow also varies with speed).

Events are saved with the preparation, the saved missions and the tracking, in
the optional `events` field of schema v1. Preparation and the active outing keep
separate events. A deleted activity loses its delays. Changing the camp, or
adding, removing or reordering a stop, removes the visibility events so a factor
is never applied to another leg; editing detours keeps their logical target.

## Link with the simulated radiation alert (#26)

The radiation order stays a proposed direct return from a fixed stop. Its
duration takes into account the visibility factors on the "return to camp" leg,
even if events change after the alert is raised. Delays of abandoned activities
are not added to the direct return. Cancelling the alert keeps the other events,
which can still be cancelled one by one. This proposal does not replace the full
plan in the budgets and gives no real position or elapsed time.

The alert and its scientific context remain explicitly simulated; the events of
#19 add no observed radiation data at Jezero.

The helmet view shares events with the planner: its activity durations, planned
remaining time, next walk and direct return use the same effects. The radiation
alert is shared too and is recalculated from its fixed starting stop.

The return limit (#33) also applies delays and speed factors. Its fallback
follows the walked part of the route in reverse: each leg keeps its own
visibility factor, unlike the proposed direct radiation return.

The radiation alert can also be raised from "Simulated events". At base, it is
an independent preview of the active outing. On a mission, it shares its state
with the helmet view. The "Mission tracking" panel only tracks activities and
does not show the alert or its trigger button. "Cancel all events" also removes
the alert from the current workspace without changing the other one.
