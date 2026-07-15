import { useEffect, useMemo, useState } from "react";
import { MapPin, Timer, LogIn, LogOut, ShieldAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { formatDateCN, formatTHBFromCents, formatTimeHM, toDateISO, toMonthISO } from "@/utils/core";
import { useT } from "@/i18n/useT";
import type { ClockType } from "@/types/domain";
import PhotoPunchDialog from "@/components/common/PhotoPunchDialog";
import { getClockPunchState } from "@/pages/employee/clockPunchState";

type GeoState = { lat: number; lng: number; addressText?: string } | null;

function punchButtonClass(enabled: boolean) {
  return enabled
    ? ""
    : "border-zinc-800 bg-zinc-950/40 text-zinc-500 shadow-none opacity-100";
}

export default function EmployeeClock() {
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const [now, setNow] = useState(() => new Date());
  const [geo, setGeo] = useState<GeoState>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [punch, setPunch] = useState<{
    type: ClockType;
    title: string;
    confirmText: string;
    requireReason?: boolean;
    requireHourlyRate?: boolean;
  } | null>(null);
  const [clockOutPerformance, setClockOutPerformance] = useState<{
    title: string;
    detail: string;
    scoreDelta: number;
    kpiRate: number;
    kpiPayoutCents: number;
  } | null>(null);

  const statusMeta = (status?: string) => {
    if (!status) return { tone: "neutral" as const, label: t("attendance.none") };
    if (status === "normal") return { tone: "good" as const, label: t("attendance.normal") };
    if (status === "late") return { tone: "warn" as const, label: t("attendance.late") };
    if (status === "early_leave") return { tone: "warn" as const, label: t("attendance.early_leave") };
    if (status === "missing") return { tone: "bad" as const, label: t("attendance.missing") };
    return { tone: "neutral" as const, label: status };
  };

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeo({ lat: 31.2304, lng: 121.4737, addressText: t("employee.clock.locationFallback") });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          addressText: t("employee.clock.locationBrowser"),
        });
      },
      () => {
        setGeoError(t("employee.clock.geoDenied"));
        setGeo({ lat: 31.2304, lng: 121.4737, addressText: t("employee.clock.locationFallback") });
      },
      { enableHighAccuracy: false, timeout: 2000 },
    );
  }, [t]);

  const todayISO = toDateISO(now);
  const today = useMemo(() => db.attendanceDaily.find(a => a.userId === userId && a.dateISO === todayISO), [db.attendanceDaily, todayISO, userId]);
  const meta = statusMeta(today?.status);
  const todaysEvents = db.clockEvents
    .filter(e => e.userId === userId && toDateISO(new Date(e.timeISO)) === todayISO)
    .slice()
    .sort((a, b) => (a.timeISO < b.timeISO ? 1 : -1));

  const punchState = useMemo(
    () =>
      getClockPunchState({
        today,
        todaysEvents,
      }),
    [today, todaysEvents],
  );

  const {
    canClockIn,
    canClockOut,
    canOtStart,
    canOtEnd,
    clockInISO,
    clockOutISO,
    otStart,
    otEnd,
    clockInDisabledReason,
    clockOutDisabledReason,
    otStartDisabledReason,
    otEndDisabledReason,
    currentHintKey,
  } = punchState;

  const eventLabel = (type: ClockType) => {
    if (type === "in") return t("employee.clock.clockIn");
    if (type === "out") return t("employee.clock.clockOut");
    if (type === "ot_start") return t("employee.clock.otStart");
    return t("employee.clock.otEnd");
  };

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-400">{formatDateCN(now)}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">{t("employee.clock.title")}</div>
          <div className="mt-1 text-sm text-zinc-400">{t("employee.clock.subtitle")}</div>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-emerald-300" />
              {t("employee.clock.currentTime")}
            </CardTitle>
            <CardDescription>{t("employee.clock.timeHint")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-5xl font-semibold tracking-tight text-zinc-100">
              {`${now.getHours()}`.padStart(2, "0")}:{`${now.getMinutes()}`.padStart(2, "0")}
              <span className="ml-2 text-lg text-zinc-500">{`${now.getSeconds()}`.padStart(2, "0")}</span>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-zinc-300">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-zinc-400" />
                <div className="min-w-0 truncate">
                  {geo?.addressText ?? t("employee.clock.locationing")}{" "}
                  {geo ? <span className="text-zinc-500">({geo.lat.toFixed(4)}, {geo.lng.toFixed(4)})</span> : null}
                </div>
              </div>
              {geoError ? (
                <div className="flex items-center gap-2 text-amber-200">
                  <ShieldAlert className="h-4 w-4" />
                  {geoError}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                disabled={!canClockIn}
                title={!canClockIn ? t(clockInDisabledReason) : undefined}
                className={punchButtonClass(canClockIn)}
                onClick={() =>
                  setPunch({
                    type: "in",
                    title: t("employee.clock.clockIn"),
                    confirmText: t("employee.clock.clockIn"),
                  })
                }
              >
                <LogIn className="h-4 w-4" />
                {t("employee.clock.clockIn")}
              </Button>
              <Button
                variant="secondary"
                disabled={!canClockOut}
                title={!canClockOut ? t(clockOutDisabledReason) : undefined}
                className={punchButtonClass(canClockOut)}
                onClick={() =>
                  setPunch({
                    type: "out",
                    title: t("employee.clock.clockOut"),
                    confirmText: t("employee.clock.clockOut"),
                  })
                }
              >
                <LogOut className="h-4 w-4" />
                {t("employee.clock.clockOut")}
              </Button>
              <Button
                variant="secondary"
                disabled={!canOtStart}
                title={!canOtStart ? t(otStartDisabledReason) : undefined}
                className={punchButtonClass(canOtStart)}
                onClick={() =>
                  setPunch({
                    type: "ot_start",
                    title: t("employee.clock.otStart"),
                    confirmText: t("employee.clock.otStart"),
                  })
                }
              >
                <Timer className="h-4 w-4" />
                {t("employee.clock.otStart")}
              </Button>
              <Button
                variant="secondary"
                disabled={!canOtEnd}
                title={!canOtEnd ? t(otEndDisabledReason) : undefined}
                className={punchButtonClass(canOtEnd)}
                onClick={() =>
                  setPunch({
                    type: "ot_end",
                    title: t("employee.clock.otEnd"),
                    confirmText: t("employee.clock.otEnd"),
                    requireReason: true,
                  })
                }
              >
                <Timer className="h-4 w-4" />
                {t("employee.clock.otEnd")}
              </Button>
            </div>

            <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{t(currentHintKey)}</span>
              </div>
            </div>

            {clockOutPerformance ? (
              <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-100">
                <div className="font-semibold">{t("employee.clock.performanceResultTitle")}</div>
                <div className="mt-1">{clockOutPerformance.title}</div>
                <div className="mt-1 text-emerald-200/80">{clockOutPerformance.detail}</div>
                <div className="mt-2">
                  {t("employee.clock.performanceResultMeta", {
                    score: clockOutPerformance.scoreDelta > 0 ? `+${clockOutPerformance.scoreDelta}` : clockOutPerformance.scoreDelta,
                    rate: `${Math.round(clockOutPerformance.kpiRate * 100)}%`,
                    payout: formatTHBFromCents(clockOutPerformance.kpiPayoutCents),
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-500">{t("employee.clock.clockInTime")}</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">{formatTimeHM(clockInISO)}</div>
              </div>
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-500">{t("employee.clock.clockOutTime")}</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">{formatTimeHM(clockOutISO)}</div>
              </div>
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-500">{t("employee.clock.otStartTime")}</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">{formatTimeHM(otStart?.timeISO)}</div>
              </div>
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-500">{t("employee.clock.otEndTime")}</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">{formatTimeHM(otEnd?.timeISO)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("employee.clock.todayRecords")}</CardTitle>
            <CardDescription>{t("employee.clock.todayRecordsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {todaysEvents.length ? (
                todaysEvents.map(e => (
                  <div key={e.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-zinc-100">{eventLabel(e.type)}</div>
                      <div className="text-sm text-zinc-300">{formatTimeHM(e.timeISO)}</div>
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                      {e.location?.addressText ?? "—"}
                    </div>
                    {e.photoDataUrl ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-900/60">
                        <img src={e.photoDataUrl} alt={t("punch.photoAlt")} className="h-20 w-full object-cover" />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">
                  {t("employee.clock.noRecords")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <PhotoPunchDialog
        open={Boolean(punch)}
        title={punch?.title ?? ""}
        confirmText={punch?.confirmText ?? ""}
        requireReason={punch?.requireReason}
        requireHourlyRate={punch?.requireHourlyRate}
        onClose={() => setPunch(null)}
        onConfirm={res => {
          if (!punch) return;
          void (async () => {
            await db.clock(userId!, punch.type, {
              location: geo ?? undefined,
              photoDataUrl: res.photoDataUrl,
              timeISO: res.capturedAtISO,
            });
            if (punch.type === "out") {
              const dateISO = toDateISO(new Date(res.capturedAtISO));
              const month = toMonthISO(new Date(res.capturedAtISO));
              const evaluation = await db.evaluateSameDayTasksOnClockOut(userId!, dateISO, res.capturedAtISO);
              const summaries = await db.generatePerformanceMonthlySummary(month);
              const summary = summaries.find(item => item.userId === userId && item.month === month);
              setClockOutPerformance({
                title: evaluation.event.title,
                detail: evaluation.event.detail,
                scoreDelta: evaluation.event.scoreDelta,
                kpiRate: summary?.kpiRate ?? 0,
                kpiPayoutCents: summary?.kpiPayoutCents ?? 0,
              });
            }
            if (punch.type === "ot_end" && otStart) {
              const rate = Number(res.hourlyRate);
              const hourlyRateCents = Number.isFinite(rate) && rate > 0 ? Math.round(rate * 100) : undefined;
              await db.submitOvertime({
                userId: userId!,
                startISO: otStart.timeISO,
                endISO: res.capturedAtISO,
                reason: res.reason?.trim() || "—",
                hourlyRateCents,
              });
            }
            setPunch(null);
          })();
        }}
      />
    </div>
  );
}
