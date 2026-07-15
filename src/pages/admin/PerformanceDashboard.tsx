import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gauge, TriangleAlert, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { useDbStore } from "@/stores/dbStore";
import { useT } from "@/i18n/useT";
import { formatTHBFromCents, toMonthISO } from "@/utils/core";

function resolveKpiRate(
  rules: Array<{ minScore: number; rate: number }>,
  finalScore: number,
) {
  return [...rules].sort((a, b) => b.minScore - a.minScore).find(rule => finalScore >= rule.minScore)?.rate ?? 0.5;
}

export default function PerformanceDashboard() {
  const db = useDbStore();
  const t = useT();
  const month = toMonthISO(new Date());

  const employees = useMemo(() => db.users.filter(user => user.role === "employee" && user.status === "active"), [db.users]);

  const rows = useMemo(
    () =>
      employees.map(user => {
        const summary = db.performanceMonthlySummaries.find(item => item.userId === user.id && item.month === month);
        const events = db.performanceEvents.filter(item => item.userId === user.id && item.month === month && !item.isReverted);
        const warnings = db.performanceWarnings.filter(item => item.userId === user.id && item.month === month && !item.resolved);
        const derivedScore = db.performanceSettings.scoreBase + events.reduce((sum, item) => sum + item.scoreDelta, 0);
        const finalScore = summary?.finalScore ?? derivedScore;
        const kpiRate = summary?.kpiRate ?? resolveKpiRate(db.performanceSettings.kpiRateRules, finalScore);
        const kpiPayoutCents = summary?.kpiPayoutCents ?? Math.round(db.performanceSettings.kpiBaseDefaultCents * kpiRate);
        return {
          user,
          finalScore,
          warningCount: summary?.warningCount ?? warnings.length,
          kpiRate,
          kpiPayoutCents,
        };
      }),
    [db.performanceEvents, db.performanceMonthlySummaries, db.performanceSettings, db.performanceWarnings, employees, month],
  );

  const highRiskCount = rows.filter(item => item.warningCount >= 3 || item.finalScore < 80).length;
  const avgScore = rows.length ? Math.round(rows.reduce((sum, item) => sum + item.finalScore, 0) / rows.length) : db.performanceSettings.scoreBase;
  const projectedPayout = rows.reduce((sum, item) => sum + item.kpiPayoutCents, 0);

  return (
    <div className="grid gap-4 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("admin.performance.title")}</div>
          <div className="mt-1 text-sm text-zinc-400">{t("admin.performance.subtitle")}</div>
        </div>
        <Link to="/admin/performance-settings">
          <Button variant="secondary">
            {t("nav.performanceSettings")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-emerald-300" />
              {t("admin.performance.avgScore")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold text-zinc-100">{avgScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TriangleAlert className="h-4 w-4 text-amber-300" />
              {t("admin.performance.highRiskCount")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold text-zinc-100">{highRiskCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-emerald-300" />
              {t("admin.performance.projectedPayout")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold text-zinc-100">{formatTHBFromCents(projectedPayout)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t("admin.performance.tableTitle")}</CardTitle>
          <CardDescription>{t("admin.performance.tableDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <thead>
              <tr>
                <Th>{t("admin.performance.colEmployee")}</Th>
                <Th>{t("admin.performance.colScore")}</Th>
                <Th>{t("admin.performance.colWarnings")}</Th>
                <Th>{t("admin.performance.colRate")}</Th>
                <Th>{t("admin.performance.colPayout")}</Th>
                <Th>{t("admin.performance.colFocus")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(item => (
                <Tr key={item.user.id}>
                  <Td>
                    <div className="font-medium text-zinc-100">{item.user.name}</div>
                    <div className="text-xs text-zinc-500">{item.user.username}</div>
                  </Td>
                  <Td>{item.finalScore}</Td>
                  <Td>{item.warningCount}</Td>
                  <Td>{Math.round(item.kpiRate * 100)}%</Td>
                  <Td>{formatTHBFromCents(item.kpiPayoutCents)}</Td>
                  <Td>
                    <Badge tone={item.warningCount >= 3 || item.finalScore < 80 ? "warn" : "good"}>
                      {item.warningCount >= 3 || item.finalScore < 80 ? t("admin.performance.focusYes") : t("admin.performance.focusNo")}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
