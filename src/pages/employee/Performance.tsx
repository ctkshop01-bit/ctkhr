import { useMemo } from "react";
import { Activity, AlertTriangle, BadgePercent, Wallet } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { useT } from "@/i18n/useT";
import { formatTHBFromCents, toMonthISO } from "@/utils/core";

function resolveKpiRate(
  rules: Array<{ minScore: number; rate: number }>,
  finalScore: number,
) {
  return [...rules].sort((a, b) => b.minScore - a.minScore).find(rule => finalScore >= rule.minScore)?.rate ?? 0.5;
}

export default function EmployeePerformance() {
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const month = toMonthISO(new Date());

  const events = useMemo(
    () => db.performanceEvents.filter(item => item.userId === userId && item.month === month && !item.isReverted),
    [db.performanceEvents, month, userId],
  );
  const warnings = useMemo(
    () => db.performanceWarnings.filter(item => item.userId === userId && item.month === month && !item.resolved),
    [db.performanceWarnings, month, userId],
  );
  const summary = db.performanceMonthlySummaries.find(item => item.userId === userId && item.month === month);

  const derived = useMemo(() => {
    const taskScore = events.filter(item => item.category === "task").reduce((sum, item) => sum + item.scoreDelta, 0);
    const attendanceScore = events.filter(item => item.category === "attendance").reduce((sum, item) => sum + item.scoreDelta, 0);
    const rewardScore = events.filter(item => item.category === "reward").reduce((sum, item) => sum + item.scoreDelta, 0);
    const warningPenaltyScore = events.filter(item => item.category === "warning").reduce((sum, item) => sum + item.scoreDelta, 0);
    const manualAdjustmentScore = events.filter(item => item.category === "manual_adjustment").reduce((sum, item) => sum + item.scoreDelta, 0);
    const finalScore =
      db.performanceSettings.scoreBase + taskScore + attendanceScore + rewardScore + warningPenaltyScore + manualAdjustmentScore;
    const kpiRate = resolveKpiRate(db.performanceSettings.kpiRateRules, finalScore);
    const kpiPayoutCents = Math.round(db.performanceSettings.kpiBaseDefaultCents * kpiRate);
    return {
      finalScore,
      warningCount: warnings.length,
      kpiRate,
      kpiPayoutCents,
    };
  }, [db.performanceSettings, events, warnings.length]);

  const current = summary ?? {
    finalScore: derived.finalScore,
    warningCount: derived.warningCount,
    kpiRate: derived.kpiRate,
    kpiPayoutCents: derived.kpiPayoutCents,
    kpiBaseCents: db.performanceSettings.kpiBaseDefaultCents,
  };

  const statCards = [
    { key: "score", icon: Activity, label: t("employee.performance.currentScore"), value: current.finalScore },
    { key: "warnings", icon: AlertTriangle, label: t("employee.performance.warningCount"), value: current.warningCount },
    { key: "rate", icon: BadgePercent, label: t("employee.performance.kpiRate"), value: `${Math.round(current.kpiRate * 100)}%` },
    { key: "payout", icon: Wallet, label: t("employee.performance.kpiPayout"), value: formatTHBFromCents(current.kpiPayoutCents) },
  ];

  return (
    <div className="grid gap-4 pb-24 lg:pb-0">
      <div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("employee.performance.title")}</div>
        <div className="mt-1 text-sm text-zinc-400">{t("employee.performance.subtitle")}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {statCards.map(item => {
          const Icon = item.icon;
          return (
            <Card key={item.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-emerald-300" />
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-semibold text-zinc-100">{item.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t("employee.performance.kpiForecast")}</CardTitle>
          <CardDescription>
            {t("employee.performance.kpiForecastDesc", {
              base: formatTHBFromCents(current.kpiBaseCents),
              payout: formatTHBFromCents(current.kpiPayoutCents),
            })}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("employee.performance.eventList")}</CardTitle>
            <CardDescription>{t("employee.performance.eventListDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {events.length ? (
              events
                .slice()
                .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
                .map(item => (
                  <div key={item.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-zinc-100">{item.title}</div>
                      <Badge tone={item.scoreDelta >= 0 ? "good" : "warn"}>
                        {item.scoreDelta >= 0 ? `+${item.scoreDelta}` : item.scoreDelta}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">{item.detail}</div>
                    <div className="mt-2 text-[11px] text-zinc-500">{new Date(item.createdAtISO).toLocaleString()}</div>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">
                {t("employee.performance.noEvents")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("employee.performance.warningList")}</CardTitle>
            <CardDescription>{t("employee.performance.warningListDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {warnings.length ? (
              warnings.map(item => (
                <div key={item.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-amber-100">{t(`employee.performance.warning.${item.warningType}`)}</div>
                    <Badge tone="warn">{t("employee.performance.warningBadge", { count: item.triggerCount })}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-amber-100/80">
                    {t("employee.performance.warningThreshold", { threshold: item.threshold })}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">
                {t("employee.performance.noWarnings")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
