import { useMemo } from "react";
import { Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { formatCNYFromCents, monthISOFromDateTimeISO, toMonthISO } from "@/utils/core";
import { useT } from "@/i18n/useT";

export default function EmployeePayroll() {
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const monthISO = toMonthISO(new Date());

  const me = db.users.find(u => u.id === userId);
  const payroll = db.payrollItems.find(p => p.userId === userId && p.monthISO === monthISO);

  const overtimeApproved = useMemo(
    () =>
      db.overtimeRequests
        .filter(r => r.userId === userId && r.status === "approved" && monthISOFromDateTimeISO(r.startISO) === monthISO)
        .reduce((sum, r) => sum + r.overtimePayCents, 0),
    [db.overtimeRequests, monthISO, userId],
  );

  return (
    <div className="pb-24 lg:pb-0">
      <div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("employee.payroll.title")}</div>
        <div className="mt-1 text-sm text-zinc-400">{t("employee.payroll.subtitle", { month: monthISO })}</div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-300" />
              {t("employee.payroll.netPay")}
            </CardTitle>
            <CardDescription>{t("employee.payroll.netPayDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="text-4xl font-semibold tracking-tight text-zinc-100">
                {formatCNYFromCents(payroll?.netPayCents ?? 0)}
              </div>
              <Badge tone={payroll ? "good" : "warn"}>{payroll ? t("employee.payroll.generated") : t("employee.payroll.notGenerated")}</Badge>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-500">{t("employee.payroll.baseSalary")}</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">{formatCNYFromCents(me?.baseSalaryCents ?? 0)}</div>
              </div>
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                  {t("employee.payroll.overtimePay")}
                </div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">{formatCNYFromCents(payroll?.overtimePayCents ?? overtimeApproved)}</div>
              </div>
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <TrendingDown className="h-4 w-4 text-rose-300" />
                  {t("employee.payroll.deductions")}
                </div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">{formatCNYFromCents(payroll?.deductionsCents ?? 0)}</div>
              </div>
            </div>

            {!payroll ? (
              <div className="mt-6 rounded-2xl border border-zinc-900/60 bg-zinc-950/20 p-4 text-sm text-zinc-400">
                {t("employee.payroll.tip")}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-zinc-900/60 bg-zinc-950/20 p-4">
                <div className="text-sm font-medium text-zinc-100">{t("employee.payroll.breakdown")}</div>
                <div className="mt-1 text-xs text-zinc-500">{t("employee.payroll.breakdownDesc")}</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                    <div className="text-xs text-zinc-500">{t("employee.payroll.paidLeaveDays")}</div>
                    <div className="mt-2 text-lg font-semibold text-zinc-100">{payroll?.paidLeaveDays ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                    <div className="text-xs text-zinc-500">{t("employee.payroll.unpaidLeaveDays")}</div>
                    <div className="mt-2 text-lg font-semibold text-zinc-100">{payroll?.unpaidLeaveDays ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                    <div className="text-xs text-zinc-500">{t("employee.payroll.unpaidLeaveDeduction")}</div>
                    <div className="mt-2 text-lg font-semibold text-zinc-100">
                      {formatCNYFromCents(payroll?.unpaidLeaveDeductionCents ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                    <div className="text-xs text-zinc-500">{t("employee.payroll.missingDays")}</div>
                    <div className="mt-2 text-lg font-semibold text-zinc-100">{payroll?.missingDays ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 sm:col-span-2">
                    <div className="text-xs text-zinc-500">{t("employee.payroll.missingDeduction")}</div>
                    <div className="mt-2 text-lg font-semibold text-zinc-100">
                      {formatCNYFromCents(payroll?.missingDeductionCents ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("employee.payroll.note")}</CardTitle>
            <CardDescription>{t("employee.payroll.noteDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 text-sm text-zinc-300">
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-500">{t("employee.payroll.overtimePay")}</div>
                <div className="mt-1 text-sm text-zinc-300">{t("employee.payroll.ruleOvertime")}</div>
              </div>
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-500">{t("employee.payroll.deductions")}</div>
                <div className="mt-1 text-sm text-zinc-300">{t("employee.payroll.ruleDeduction")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
