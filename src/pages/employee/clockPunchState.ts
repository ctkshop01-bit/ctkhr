import type { ClockEvent, DailyAttendance } from "../../types/domain.js";

type ClockPunchStateInput = {
  today?: DailyAttendance;
  todaysEvents: ClockEvent[];
};

function firstEventOfType(events: ClockEvent[], type: ClockEvent["type"]) {
  return events
    .filter(event => event.type === type)
    .slice()
    .sort((a, b) => (a.timeISO > b.timeISO ? 1 : -1))[0];
}

export function getClockPunchState({ today, todaysEvents }: ClockPunchStateInput) {
  const clockInEvent = firstEventOfType(todaysEvents, "in");
  const clockOutEvent = firstEventOfType(todaysEvents, "out");
  const otStart = firstEventOfType(todaysEvents, "ot_start");
  const otEnd = firstEventOfType(todaysEvents, "ot_end");

  const clockInISO = today?.clockInISO ?? clockInEvent?.timeISO;
  const clockOutISO = today?.clockOutISO ?? clockOutEvent?.timeISO;
  const canClockIn = !clockInISO;
  const canClockOut = Boolean(clockInISO) && !clockOutISO;
  const canOtStart = Boolean(clockInISO) && Boolean(clockOutISO) && !otStart && !otEnd;
  const canOtEnd = Boolean(otStart) && !otEnd;

  const clockInDisabledReason = canClockIn ? undefined : "employee.clock.hintClockInDone";
  const clockOutDisabledReason = canClockOut
    ? undefined
    : !clockInISO
      ? "employee.clock.hintClockOutAfterClockIn"
      : "employee.clock.hintClockOutDone";
  const otStartDisabledReason = canOtStart
    ? undefined
    : !clockOutISO
      ? "employee.clock.hintOtStartAfterClockOut"
      : "employee.clock.hintOtStartDone";
  const otEndDisabledReason = canOtEnd
    ? undefined
    : !otStart
      ? "employee.clock.hintOtEndAfterOtStart"
      : "employee.clock.hintOtEndDone";

  const currentHintKey = canClockIn
    ? "employee.clock.hintNowClockIn"
    : canClockOut
      ? "employee.clock.hintNowClockOut"
      : canOtStart
        ? "employee.clock.hintNowOtStart"
        : canOtEnd
          ? "employee.clock.hintNowOtEnd"
          : "employee.clock.hintDoneToday";

  return {
    clockInISO,
    clockOutISO,
    otStart,
    otEnd,
    canClockIn,
    canClockOut,
    canOtStart,
    canOtEnd,
    clockInDisabledReason,
    clockOutDisabledReason,
    otStartDisabledReason,
    otEndDisabledReason,
    currentHintKey,
  };
}
