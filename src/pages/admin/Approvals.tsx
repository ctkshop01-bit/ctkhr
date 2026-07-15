import { useMemo, useState } from "react";
import { CheckCircle2, Clock4, FileText, ShieldAlert, XCircle } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { formatDateCN, formatTimeHM } from "@/utils/core";
import { useT } from "@/i18n/useT";

type ReviewTarget =
  | { type: "leave"; id: string }
  | { type: "overtime"; id: string }
  | { type: "attendance"; id: string }
  | { type: "task"; id: string };

type ApprovalTab = "leave" | "overtime" | "attendance" | "task";

function toISOFromLocal(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function AdminApprovals() {
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const [tab, setTab] = useState<ApprovalTab>("leave");
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [note, setNote] = useState("");
  const [otRate, setOtRate] = useState("");
  const [otPay, setOtPay] = useState("");

  const [fixIn, setFixIn] = useState("");
  const [fixOut, setFixOut] = useState("");
  const [fixReason, setFixReason] = useState("");

  const pendingLeave = useMemo(() => db.leaveRequests.filter(r => r.status === "pending"), [db.leaveRequests]);
  const pendingOvertime = useMemo(() => db.overtimeRequests.filter(r => r.status === "pending"), [db.overtimeRequests]);
  const pendingTasks = useMemo(
    () => db.tasks.filter(task => task.status === "submitted").slice().sort((a, b) => (a.submittedAtISO ?? "") < (b.submittedAtISO ?? "") ? 1 : -1),
    [db.tasks],
  );
  const abnormalAttendance = useMemo(
    () => db.attendanceDaily.filter(a => ["late", "early_leave", "missing"].includes(a.status) && !a.confirmed).slice().sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1)),
    [db.attendanceDaily],
  );
  const reviewerId =
    tab === "leave"
      ? db.approvalSettings.leaveReviewerUserId
      : tab === "overtime"
        ? db.approvalSettings.overtimeReviewerUserId
        : tab === "attendance"
          ? db.approvalSettings.attendanceReviewerUserId
          : userId ?? null;
  const recentLogs = useMemo(
    () =>
      db.approvalLogs
        .filter(log => log.requestType === tab)
        .slice()
        .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
        .slice(0, 5),
    [db.approvalLogs, tab],
  );

  const openLeave = target?.type === "leave" ? db.leaveRequests.find(r => r.id === target.id) : undefined;
  const openOvertime = target?.type === "overtime" ? db.overtimeRequests.find(r => r.id === target.id) : undefined;
  const openAttendance = target?.type === "attendance" ? db.attendanceDaily.find(r => r.id === target.id) : undefined;
  const openTask = target?.type === "task" ? db.tasks.find(task => task.id === target.id) : undefined;
  const openTaskReviewLogs = useMemo(
    () =>
      target?.type === "task"
        ? (db.taskReviewLogs ?? [])
            .filter(log => log.taskId === target.id)
            .slice()
            .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
        : [],
    [db.taskReviewLogs, target],
  );

  const userName = (id: string) => db.users.find(u => u.id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("admin.approvals.title")}</div>
          <div className="mt-1 text-sm text-zinc-400">{t("admin.approvals.subtitle")}</div>
        </div>
        <Tabs
          options={[
            { key: "leave", label: `${t("admin.approvals.leave")} (${pendingLeave.length})` },
            { key: "overtime", label: `${t("admin.approvals.overtime")} (${pendingOvertime.length})` },
            { key: "task", label: `${t("admin.approvals.tasks")} (${pendingTasks.length})` },
            { key: "attendance", label: `${t("admin.approvals.abnormal")} (${abnormalAttendance.length})` },
          ]}
          value={tab}
          onChange={k => setTab(k as ApprovalTab)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("admin.approvals.reviewerTitle")}</CardTitle>
            <CardDescription>{t("admin.approvals.reviewerDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
              <div className="text-xs text-zinc-500">{t("admin.approvals.reviewerLabel")}</div>
              <div className="mt-2 text-base font-semibold text-zinc-100">
                {reviewerId ? userName(reviewerId) : t("admin.approvals.reviewerUnset")}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("admin.approvals.logSummaryTitle")}</CardTitle>
            <CardDescription>{t("admin.approvals.logSummaryDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {recentLogs.length ? (
              recentLogs.map(log => (
                <div key={log.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-zinc-100">{userName(log.submitterUserId)}</div>
                    <div className="text-xs text-zinc-500">{new Date(log.createdAtISO).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    {t("admin.approvals.logSummaryLine", {
                      reviewer: userName(log.reviewerUserId),
                      decision: log.decision,
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">
                {t("admin.approvals.logSummaryEmpty")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {tab === "leave" ? (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-300" />
              {t("admin.approvals.leavePending")}
            </CardTitle>
            <CardDescription>{t("admin.approvals.leavePendingDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {pendingLeave.length ? (
                pendingLeave.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setNote("");
                      setTarget({ type: "leave", id: r.id });
                    }}
                    className="text-left rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 hover:bg-zinc-900/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">
                          {userName(r.userId)} · {r.leaveType === "annual" ? t("leave.annual") : r.leaveType === "sick" ? t("leave.sick") : r.leaveType === "personal" ? t("leave.personal") : t("leave.other")}
                          <span className="ml-2 text-xs text-zinc-500">
                            {r.hours} {t("common.hours")}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {formatDateCN(r.startISO)} - {formatDateCN(r.endISO)}
                        </div>
                        <div className="mt-2 line-clamp-2 text-xs text-zinc-500">{r.reason}</div>
                      </div>
                      <Badge tone="warn">
                        <Clock4 className="h-3.5 w-3.5" />
                        {t("status.pending")}
                      </Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("admin.approvals.noLeave")}</div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : tab === "overtime" ? (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-300" />
              {t("admin.approvals.overtimePending")}
            </CardTitle>
            <CardDescription>{t("admin.approvals.overtimePendingDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {pendingOvertime.length ? (
                pendingOvertime.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setNote("");
                      setOtRate((r.hourlyRateCents / 100).toFixed(2));
                      setOtPay((r.overtimePayCents / 100).toFixed(2));
                      setTarget({ type: "overtime", id: r.id });
                    }}
                    className="text-left rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 hover:bg-zinc-900/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">
                          {userName(r.userId)} · {r.hours} {t("common.hours")}
                          <span className="ml-2 text-xs text-zinc-500">{t("admin.approvals.overtimeEstimateMoney", { amount: (r.overtimePayCents / 100).toFixed(2) })}</span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {formatDateCN(r.startISO)} - {formatDateCN(r.endISO)}
                        </div>
                        <div className="mt-2 line-clamp-2 text-xs text-zinc-500">{r.reason}</div>
                      </div>
                      <Badge tone="warn">
                        <Clock4 className="h-3.5 w-3.5" />
                        {t("status.pending")}
                      </Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("admin.approvals.noOvertime")}</div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : tab === "task" ? (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-300" />
              {t("admin.approvals.taskPending")}
            </CardTitle>
            <CardDescription>{t("admin.approvals.taskPendingDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {pendingTasks.length ? (
                pendingTasks.map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setNote(task.lastReturnReason ?? "");
                      setTarget({ type: "task", id: task.id });
                    }}
                    className="text-left rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 hover:bg-zinc-900/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">{task.title}</div>
                        {task.description ? <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{task.description}</div> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{task.taskType === "same_day" ? t("employee.tasks.sameDay") : t("employee.tasks.normalTask")}</span>
                          <span>{task.submittedAtISO ? formatDateCN(task.submittedAtISO) : "—"}</span>
                        </div>
                      </div>
                      <Badge tone="warn">
                        <Clock4 className="h-3.5 w-3.5" />
                        {t("employee.tasks.submitted")}
                      </Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("admin.approvals.noTasks")}</div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-emerald-300" />
              {t("admin.approvals.abnormalTitle")}
            </CardTitle>
            <CardDescription>{t("admin.approvals.abnormalDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {abnormalAttendance.length ? (
                abnormalAttendance.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setTarget({ type: "attendance", id: a.id });
                      setFixIn(a.clockInISO ? new Date(a.clockInISO).toISOString().slice(0, 16) : "");
                      setFixOut(a.clockOutISO ? new Date(a.clockOutISO).toISOString().slice(0, 16) : "");
                      setFixReason(a.abnormalReason ?? "");
                    }}
                    className="text-left rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 hover:bg-zinc-900/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">
                          {userName(a.userId)} · {a.dateISO}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {t("employee.dashboard.clockDesc", { in: formatTimeHM(a.clockInISO), out: formatTimeHM(a.clockOutISO) })}
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">{a.abnormalReason ?? "—"}</div>
                      </div>
                      <Badge tone="warn">{t("admin.approvals.processing")}</Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("admin.approvals.noAbnormal")}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(openLeave)}
        title={t("admin.approvals.leaveDialog")}
        description={openLeave ? `${userName(openLeave.userId)} · ${formatDateCN(openLeave.startISO)} - ${formatDateCN(openLeave.endISO)}` : undefined}
        onClose={() => setTarget(null)}
        footer={
          openLeave ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  db.reviewLeave(openLeave.id, userId!, "rejected", note.trim() || undefined);
                  setTarget(null);
                }}
              >
                <XCircle className="h-4 w-4" />
                {t("action.reject")}
              </Button>
              <Button
                onClick={() => {
                  db.reviewLeave(openLeave.id, userId!, "approved", note.trim() || undefined);
                  setTarget(null);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("action.approve")}
              </Button>
            </div>
          ) : null
        }
      >
        {openLeave ? (
          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-200">
              <div className="text-xs text-zinc-500">{t("admin.approvals.reason")}</div>
              <div className="mt-2 whitespace-pre-wrap leading-6">{openLeave.reason}</div>
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.approvals.reviewNote")}</div>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t("admin.approvals.reviewNotePH")} />
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(openOvertime)}
        title={t("admin.approvals.overtimeDialog")}
        description={openOvertime ? `${userName(openOvertime.userId)} · ${formatDateCN(openOvertime.startISO)} - ${formatDateCN(openOvertime.endISO)}` : undefined}
        onClose={() => setTarget(null)}
        footer={
          openOvertime ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  db.reviewOvertime(
                    openOvertime.id,
                    userId!,
                    "rejected",
                    note.trim() || undefined,
                  );
                  setTarget(null);
                }}
              >
                <XCircle className="h-4 w-4" />
                {t("action.reject")}
              </Button>
              <Button
                onClick={() => {
                  const rate = Number(otRate);
                  const pay = Number(otPay);
                  db.reviewOvertime(
                    openOvertime.id,
                    userId!,
                    "approved",
                    note.trim() || undefined,
                    {
                      hourlyRateCents: Number.isFinite(rate) && rate > 0 ? Math.round(rate * 100) : openOvertime.hourlyRateCents,
                      overtimePayCents: Number.isFinite(pay) && pay >= 0 ? Math.round(pay * 100) : openOvertime.overtimePayCents,
                    },
                  );
                  setTarget(null);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("action.approve")}
              </Button>
            </div>
          ) : null
        }
      >
        {openOvertime ? (
          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-200">
              <div className="text-xs text-zinc-500">{t("admin.approvals.overtimeReason")}</div>
              <div className="mt-2 whitespace-pre-wrap leading-6">{openOvertime.reason}</div>
              <div className="mt-3 text-xs text-zinc-500">
                {openOvertime.hours} {t("common.hours")} · {t("employee.payroll.overtimePay")} {(openOvertime.overtimePayCents / 100).toFixed(2)}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
              <div className="text-xs font-medium text-zinc-300">{t("admin.approvals.overtimeAdjust")}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-xs text-zinc-500">{t("admin.approvals.overtimeHourlyRate")}</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={otRate}
                    onChange={e => {
                      const v = e.target.value;
                      setOtRate(v);
                      const n = Number(v);
                      if (!Number.isFinite(n) || n <= 0) return;
                      setOtPay((n * openOvertime.hours).toFixed(2));
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs text-zinc-500">{t("admin.approvals.overtimeTotalPay")}</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={otPay}
                    onChange={e => {
                      const v = e.target.value;
                      setOtPay(v);
                      const n = Number(v);
                      if (!Number.isFinite(n) || n < 0) return;
                      if (openOvertime.hours <= 0) return;
                      setOtRate((n / openOvertime.hours).toFixed(2));
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.approvals.reviewNote")}</div>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t("admin.approvals.reviewNotePH")} />
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(openTask)}
        title={t("admin.approvals.taskDialog")}
        description={openTask ? `${openTask.title} · ${openTask.taskType === "same_day" ? t("employee.tasks.sameDay") : t("employee.tasks.normalTask")}` : undefined}
        onClose={() => setTarget(null)}
        footer={
          openTask ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  db.reviewTaskCompletion(openTask.id, userId!, "return", note.trim() || undefined);
                  setTarget(null);
                }}
              >
                <XCircle className="h-4 w-4" />
                {t("action.reject")}
              </Button>
              <Button
                onClick={() => {
                  db.reviewTaskCompletion(openTask.id, userId!, "confirm", note.trim() || undefined);
                  setTarget(null);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("action.approve")}
              </Button>
            </div>
          ) : null
        }
      >
        {openTask ? (
          <div className="grid gap-3">
            {openTask.description ? (
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-200">
                <div className="text-xs text-zinc-500">{t("common.description")}</div>
                <div className="mt-2 whitespace-pre-wrap leading-6">{openTask.description}</div>
              </div>
            ) : null}
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-xs text-zinc-400">
              {t("admin.approvals.taskReviewHint")}
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.approvals.taskReviewHistory")}</div>
              {openTaskReviewLogs.length ? (
                <div className="grid gap-2">
                  {openTaskReviewLogs.map(log => (
                    <div key={log.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-3 text-xs text-zinc-300">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-zinc-100">
                          {log.action === "submit"
                            ? t("admin.approvals.taskReviewActionSubmit")
                            : log.action === "confirm"
                              ? t("admin.approvals.taskReviewActionConfirm")
                              : t("admin.approvals.taskReviewActionReturn")}
                        </div>
                        <div className="text-zinc-500">{new Date(log.createdAtISO).toLocaleString()}</div>
                      </div>
                      <div className="mt-1 text-zinc-400">{userName(log.operatorUserId)}</div>
                      {log.reason ? <div className="mt-2 text-amber-100">{log.reason}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-3 text-xs text-zinc-500">
                  {t("admin.approvals.taskReviewEmpty")}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.approvals.reviewNote")}</div>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t("admin.approvals.reviewNotePH")} />
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(openAttendance)}
        title={t("admin.approvals.abnormalDialog")}
        description={openAttendance ? `${userName(openAttendance.userId)} · ${openAttendance.dateISO}` : undefined}
        onClose={() => setTarget(null)}
        footer={
          openAttendance ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTarget(null)}>
                {t("action.cancel")}
              </Button>
              <Button
                onClick={() => {
                  const clockInISO = fixIn ? toISOFromLocal(fixIn) : null;
                  const clockOutISO = fixOut ? toISOFromLocal(fixOut) : null;
                  db.confirmAttendance(openAttendance.id, {
                    clockInISO: clockInISO ?? undefined,
                    clockOutISO: clockOutISO ?? undefined,
                    abnormalReason: fixReason.trim() || undefined,
                  });
                  setTarget(null);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("action.confirm")}
              </Button>
            </div>
          ) : null
        }
      >
        {openAttendance ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-500">{t("admin.approvals.currentRecord")}</div>
                <Badge tone="warn">{t("admin.approvals.abnormal")}</Badge>
              </div>
              <div className="mt-2 text-sm text-zinc-200">
                {t("employee.dashboard.clockDesc", { in: formatTimeHM(openAttendance.clockInISO), out: formatTimeHM(openAttendance.clockOutISO) })}
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {t("common.reason", { reason: openAttendance.abnormalReason?.startsWith("reason.") ? t(openAttendance.abnormalReason) : openAttendance.abnormalReason ?? "—" })}
              </div>
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.approvals.clockInFix")}</div>
              <Input type="datetime-local" value={fixIn} onChange={e => setFixIn(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.approvals.clockOutFix")}</div>
              <Input type="datetime-local" value={fixOut} onChange={e => setFixOut(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.approvals.memoFix")}</div>
              <Textarea value={fixReason} onChange={e => setFixReason(e.target.value)} placeholder={t("admin.approvals.memoFixPH")} />
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
