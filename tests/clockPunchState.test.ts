import test from "node:test";
import assert from "node:assert/strict";
import type { ClockEvent, DailyAttendance } from "../src/types/domain.js";
import { getClockPunchState } from "../src/pages/employee/clockPunchState.js";

test("enables overtime start when same-day in/out events exist even if daily summary is missing", () => {
  const events: ClockEvent[] = [
    { id: "clk_1", userId: "u1", type: "in", timeISO: "2026-06-22T02:18:00+07:00" },
    { id: "clk_2", userId: "u1", type: "out", timeISO: "2026-06-22T02:29:00+07:00" },
  ];

  const state = getClockPunchState({
    today: undefined,
    todaysEvents: events,
  });

  assert.equal(state.canClockIn, false);
  assert.equal(state.canClockOut, false);
  assert.equal(state.canOtStart, true);
  assert.equal(state.canOtEnd, false);
  assert.equal(state.clockOutDisabledReason, "employee.clock.hintClockOutDone");
  assert.equal(state.otEndDisabledReason, "employee.clock.hintOtEndAfterOtStart");
  assert.equal(state.clockInISO, "2026-06-22T02:18:00+07:00");
  assert.equal(state.clockOutISO, "2026-06-22T02:29:00+07:00");
});

test("enables overtime end after overtime start is recorded", () => {
  const today: DailyAttendance = {
    id: "att_1",
    userId: "u1",
    dateISO: "2026-06-22",
    clockInISO: "2026-06-22T02:18:00+07:00",
    clockOutISO: "2026-06-22T02:29:00+07:00",
    status: "early_leave",
  };

  const events: ClockEvent[] = [
    { id: "clk_1", userId: "u1", type: "in", timeISO: "2026-06-22T02:18:00+07:00" },
    { id: "clk_2", userId: "u1", type: "out", timeISO: "2026-06-22T02:29:00+07:00" },
    { id: "clk_3", userId: "u1", type: "ot_start", timeISO: "2026-06-22T02:31:00+07:00" },
  ];

  const state = getClockPunchState({
    today,
    todaysEvents: events,
  });

  assert.equal(state.canOtStart, false);
  assert.equal(state.canOtEnd, true);
  assert.equal(state.otStartDisabledReason, "employee.clock.hintOtStartDone");
  assert.equal(state.otStart?.timeISO, "2026-06-22T02:31:00+07:00");
});

test("returns guidance text for the next available punch step", () => {
  const state = getClockPunchState({
    today: undefined,
    todaysEvents: [],
  });

  assert.equal(state.canClockIn, true);
  assert.equal(state.canClockOut, false);
  assert.equal(state.canOtStart, false);
  assert.equal(state.canOtEnd, false);
  assert.equal(state.clockOutDisabledReason, "employee.clock.hintClockOutAfterClockIn");
  assert.equal(state.otStartDisabledReason, "employee.clock.hintOtStartAfterClockOut");
  assert.equal(state.otEndDisabledReason, "employee.clock.hintOtEndAfterOtStart");
});
