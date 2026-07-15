import { useMemo } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { formatDateCN, formatTimeHM, toDateISO } from "@/utils/core";
import { useT } from "@/i18n/useT";

export default function EmployeeAttendance() {
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();

  const meta = (status: string) => {
    if (status === "normal") return { tone: "good" as const, label: t("attendance.normal") };
    if (status === "late") return { tone: "warn" as const, label: t("attendance.late") };
    if (status === "early_leave") return { tone: "warn" as const, label: t("attendance.early_leave") };
    if (status === "missing") return { tone: "bad" as const, label: t("attendance.missing") };
    if (status === "leave") return { tone: "neutral" as const, label: t("attendance.leave") };
    if (status === "overtime") return { tone: "good" as const, label: t("attendance.overtime") };
    return { tone: "neutral" as const, label: status };
  };

  const list = useMemo(() => {
    const items = db.attendanceDaily.filter(a => a.userId === userId).slice();
    items.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
    return items.slice(0, 45);
  }, [db.attendanceDaily, userId]);

  const todayISO = toDateISO(new Date());

  return (
    <div className="pb-24 lg:pb-0">
      <div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("employee.attendance.title")}</div>
        <div className="mt-1 text-sm text-zinc-400">{t("employee.attendance.subtitle")}</div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-300" />
              {t("employee.attendance.list")}
            </CardTitle>
            <CardDescription>{t("employee.attendance.listDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {list.length ? (
                list.map(a => {
                  const m = meta(a.status);
                  return (
                    <div key={a.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Badge tone={m.tone}>{m.label}</Badge>
                          <div className="text-sm font-semibold text-zinc-100">{formatDateCN(`${a.dateISO}T00:00:00.000Z`)}</div>
                          {a.dateISO === todayISO ? <span className="text-xs text-emerald-200">{t("common.today")}</span> : null}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {t("employee.dashboard.clockDesc", { in: formatTimeHM(a.clockInISO), out: formatTimeHM(a.clockOutISO) })}
                        </div>
                      </div>
                      {a.abnormalReason ? (
                        <div className="mt-2 text-xs text-zinc-500">
                          {t("common.note", { note: a.abnormalReason.startsWith("reason.") ? t(a.abnormalReason) : a.abnormalReason })}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("employee.attendance.noData")}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-emerald-300" />
              {t("employee.attendance.abnormalHint")}
            </CardTitle>
            <CardDescription>{t("employee.attendance.abnormalHint")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-300">
              <div className="text-xs text-zinc-500">{t("employee.attendance.rules")}</div>
              <div className="mt-2 grid gap-2">
                {db.deductionRules.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate">{r.name}</div>
                    <Badge tone={r.enabled ? "good" : "neutral"}>{r.enabled ? t("common.enabled") : t("common.disabled")}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
