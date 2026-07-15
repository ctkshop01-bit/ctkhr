import { useMemo } from "react";
import { BarChart3, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useDbStore } from "@/stores/dbStore";
import { monthISOFromDateTimeISO, toMonthISO } from "@/utils/core";
import { useT } from "@/i18n/useT";

function Bar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="truncate">{label}</div>
        <div className="shrink-0 text-zinc-300">{value}h</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-900/60">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const db = useDbStore();
  const t = useT();
  const monthISO = toMonthISO(new Date());
  const employees = db.users.filter(u => u.role === "employee" && u.status === "active");

  const overtimeByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of db.overtimeRequests) {
      if (r.status !== "approved") continue;
      if (monthISOFromDateTimeISO(r.startISO) !== monthISO) continue;
      map.set(r.userId, (map.get(r.userId) ?? 0) + r.hours);
    }
    return employees
      .map(u => ({ id: u.id, name: u.name, hours: Number((map.get(u.id) ?? 0).toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [db.overtimeRequests, employees, monthISO]);

  const statusDist = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const a of db.attendanceDaily) {
      if (!a.dateISO.startsWith(`${monthISO}-`)) continue;
      dist[a.status] = (dist[a.status] ?? 0) + 1;
    }
    const items = Object.entries(dist).map(([k, v]) => ({ key: k, count: v }));
    items.sort((a, b) => b.count - a.count);
    return items;
  }, [db.attendanceDaily, monthISO]);

  const maxOvertime = overtimeByUser.reduce((m, x) => Math.max(m, x.hours), 0);
  const maxStatus = statusDist.reduce((m, x) => Math.max(m, x.count), 0);

  return (
    <div>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("admin.analytics.title")}</div>
        <div className="mt-1 text-sm text-zinc-400">{t("admin.analytics.subtitle", { month: monthISO })}</div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-300" />
              {t("admin.analytics.overtimeRank")}
            </CardTitle>
            <CardDescription>{t("admin.analytics.overtimeRankDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {overtimeByUser.length ? (
                overtimeByUser.map(i => <Bar key={i.id} label={i.name} value={i.hours} max={maxOvertime} />)
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("admin.analytics.noData")}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-300" />
              {t("admin.analytics.statusDist")}
            </CardTitle>
            <CardDescription>{t("admin.analytics.statusDistDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {statusDist.length ? (
                statusDist.map(i => (
                  <div key={i.key} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-zinc-100">{t(`attendance.${i.key}`)}</div>
                      <Badge tone={i.key === "normal" ? "good" : i.key === "missing" ? "bad" : "warn"}>{i.count}</Badge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900/60">
                      <div className="h-full rounded-full bg-zinc-100" style={{ width: `${Math.round((i.count / maxStatus) * 100)}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("admin.analytics.noData")}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
