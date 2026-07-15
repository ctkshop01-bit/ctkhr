import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, CalendarDays, Clock3, Megaphone, Pencil, Receipt, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { formatCNYFromCents, formatDateCN, formatTimeHM, monthISOFromDateTimeISO, toDateISO, toMonthISO } from "@/utils/core";
import { useT } from "@/i18n/useT";
import Dialog from "@/components/ui/Dialog";

export default function EmployeeDashboard() {
  const { userId, name } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const [offOpen, setOffOpen] = useState(false);
  const [offDraft, setOffDraft] = useState<number[]>([]);

  const me = db.users.find(u => u.id === userId);
  const weeklyOffDays = me?.weeklyOffDays ?? [];
  const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const weekdayLabel = (d: number) => t(`weekday.${weekdayKeys[d]}`);

  const statusTone = (status?: string) => {
    if (!status) return { tone: "neutral" as const, label: t("attendance.none") };
    if (status === "normal") return { tone: "good" as const, label: t("attendance.normal") };
    if (status === "late") return { tone: "warn" as const, label: t("attendance.late") };
    if (status === "early_leave") return { tone: "warn" as const, label: t("attendance.early_leave") };
    if (status === "missing") return { tone: "bad" as const, label: t("attendance.missing") };
    if (status === "leave") return { tone: "neutral" as const, label: t("attendance.leave") };
    if (status === "overtime") return { tone: "good" as const, label: t("attendance.overtime") };
    return { tone: "neutral" as const, label: status };
  };

  const todayISO = toDateISO(new Date());
  const monthISO = toMonthISO(new Date());

  const today = db.attendanceDaily.find(a => a.userId === userId && a.dateISO === todayISO);
  const tag = statusTone(today?.status);
  const unreadNotifications = db.notifications.filter(n => !n.isRead).filter(n => n.userId === userId);
  const currentLeaveBalance = db.leaveBalances.find(b => b.userId === userId && b.month === monthISO);

  const overtimeThisMonth = db.overtimeRequests
    .filter(r => r.userId === userId && r.status === "approved" && monthISOFromDateTimeISO(r.startISO) === monthISO)
    .reduce((sum, r) => sum + r.overtimePayCents, 0);

  const lastPayroll = db.payrollItems.find(p => p.userId === userId && p.monthISO === monthISO);
  const pinnedAnnouncements = db.announcements
    .filter(a => a.pinned)
    .slice()
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
    .slice(0, 2);

  const tasks = db.tasks.slice(0, 3);

  return (
    <div className="pb-20 lg:pb-0">
      <div className="flex flex-col gap-2">
        <div className="text-xs text-zinc-400">{formatDateCN(new Date().toISOString())}</div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-zinc-100">
              {t("employee.dashboard.greeting", { name: name ?? "—" })}
            </div>
            <div className="mt-1 text-sm text-zinc-400">{t("employee.dashboard.subtitle")}</div>
          </div>
          <Link to="/app/clock">
            <Button>
              <Clock3 className="h-4 w-4" />
              {t("action.clockNow")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              {t("employee.dashboard.todayClock")}
            </CardTitle>
            <CardDescription>
              {t("employee.dashboard.clockDesc", {
                in: today?.clockInISO ? formatTimeHM(today.clockInISO) : "--:--",
                out: today?.clockOutISO ? formatTimeHM(today.clockOutISO) : "--:--",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={tag.tone}>{tag.label}</Badge>
              <div className="text-xs text-zinc-400">
                {t("employee.dashboard.rulesLine", {
                  late: db.deductionRules.find(r => r.type === "late")?.enabled ? t("common.enabled") : t("common.disabled"),
                  missing: db.deductionRules.find(r => r.type === "missing")?.enabled ? t("common.enabled") : t("common.disabled"),
                })}
              </div>
            </div>
            {today?.abnormalReason ? (
              <div className="mt-3 text-sm text-rose-200">
                {t("employee.dashboard.alert", { reason: today.abnormalReason.startsWith("reason.") ? t(today.abnormalReason) : today.abnormalReason })}
              </div>
            ) : (
              <div className="mt-3 text-sm text-zinc-400">{t("employee.dashboard.keepPace")}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-300" />
              {t("employee.dashboard.salaryThisMonth")}
            </CardTitle>
            <CardDescription>{t("employee.dashboard.salaryDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold text-zinc-100">{formatCNYFromCents(lastPayroll?.netPayCents ?? 0)}</div>
            <div className="mt-2 text-xs text-zinc-400">
              {t("employee.payroll.overtimePay")} {formatCNYFromCents(overtimeThisMonth)} · {lastPayroll ? t("employee.payroll.generated") : t("employee.payroll.notGenerated")}
            </div>
            <div className="mt-4">
              <Link to="/app/payroll">
                <Button variant="secondary" className="w-full">
                  {t("action.viewDetail")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-emerald-300" />
                  {t("employee.offdays.title")}
                </CardTitle>
                <CardDescription>{t("employee.offdays.desc")}</CardDescription>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setOffDraft(weeklyOffDays.slice());
                  setOffOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                {t("employee.offdays.edit")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {weeklyOffDays.length ? (
              <div className="flex flex-wrap gap-2">
                {weeklyOffDays.map(d => (
                  <span key={d} className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-300">
                    {weekdayLabel(d)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">{t("employee.offdays.none")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-300" />
              {t("employee.dashboard.unreadTitle")}
            </CardTitle>
            <CardDescription>{t("employee.dashboard.unreadDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold text-zinc-100">{unreadNotifications.length}</div>
            <div className="mt-2 text-xs text-zinc-400">
              {unreadNotifications.length
                ? t("employee.dashboard.unreadHint", { count: unreadNotifications.length })
                : t("employee.dashboard.unreadEmpty")}
            </div>
            <div className="mt-4">
              <Link to="/app/notifications">
                <Button variant="secondary" className="w-full">
                  {t("employee.nav.notifications")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-300" />
              {t("employee.dashboard.leaveBalanceTitle")}
            </CardTitle>
            <CardDescription>{t("employee.dashboard.leaveBalanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold text-zinc-100">{currentLeaveBalance?.closingBalanceDays ?? 0}</div>
            <div className="mt-2 text-xs text-zinc-400">
              {t("employee.dashboard.leaveBalanceHint", {
                paid: currentLeaveBalance?.closingBalanceDays ?? 0,
                carried: currentLeaveBalance?.carriedDays ?? 0,
              })}
            </div>
            <div className="mt-4">
              <Link to="/app/requests">
                <Button variant="secondary" className="w-full">
                  {t("nav.requests")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-emerald-300" />
              {t("employee.dashboard.pinnedAnnouncements")}
            </CardTitle>
            <CardDescription>{t("employee.dashboard.pinnedAnnouncementsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {pinnedAnnouncements.length ? (
                pinnedAnnouncements.map(a => (
                  <Link key={a.id} to="/app/announcements" className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 hover:bg-zinc-900/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">{a.title}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{a.content}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-500" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-zinc-500">{t("employee.dashboard.noAnnouncements")}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-300" />
              {t("employee.dashboard.todo")}
            </CardTitle>
            <CardDescription>{t("employee.dashboard.todoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2">
              {tasks.length ? (
                tasks.map(task => (
                  <div key={task.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-100">{task.title}</div>
                        {task.description ? <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{task.description}</div> : null}
                      </div>
                      <Badge tone={task.status === "confirmed" || task.status === "closed" ? "good" : task.status === "returned" || task.status === "overdue" ? "warn" : "neutral"}>
                        {task.status === "submitted"
                          ? t("employee.tasks.submitted")
                          : task.status === "confirmed"
                            ? t("employee.tasks.confirmed")
                            : task.status === "returned"
                              ? t("employee.tasks.returned")
                              : task.status === "overdue"
                                ? t("employee.tasks.overdue")
                                : task.status === "closed"
                                  ? t("employee.tasks.closed")
                                  : t("employee.tasks.open")}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-500">{t("employee.dashboard.noTasks")}</div>
              )}
            </div>
            <div className="mt-4">
              <Link to="/app/tasks">
                <Button variant="secondary" className="w-full">
                  {t("action.viewAll")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={offOpen}
        title={t("employee.offdays.edit")}
        description={t("employee.offdays.desc")}
        onClose={() => setOffOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOffOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              onClick={() => {
                db.setUserWeeklyOffDays(userId!, offDraft);
                setOffOpen(false);
              }}
            >
              {t("action.save")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {weekdayKeys.map((k, idx) => {
              const active = offDraft.includes(idx);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOffDraft(s => (s.includes(idx) ? s.filter(v => v !== idx) : [...s, idx]))}
                  className={`rounded-full border px-3 py-1.5 text-xs ${active ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-zinc-800 bg-zinc-950/30 text-zinc-300 hover:bg-zinc-900/30"}`}
                >
                  {t(`weekday.${k}`)}
                </button>
              );
            })}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
