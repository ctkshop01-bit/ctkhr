import { useMemo, useState } from "react";
import { CheckCircle2, Clock4, FileText, XCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCNYFromCents, formatDateCN, toMonthISO } from "@/utils/core";
import { useT } from "@/i18n/useT";

function toISOFromLocal(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function getRequestSubmitErrorKey(error: unknown) {
  if (error instanceof Error && /reviewer is not configured/i.test(error.message)) {
    return "employee.requests.submitErrorReviewerNotConfigured";
  }
  return "employee.requests.submitErrorGeneric";
}

export default function EmployeeRequests() {
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const [tab, setTab] = useState<"leave" | "overtime">("leave");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const statusTone = (status: string) => {
    if (status === "approved") return { tone: "good" as const, label: t("status.approved"), icon: CheckCircle2 };
    if (status === "rejected") return { tone: "bad" as const, label: t("status.rejected"), icon: XCircle };
    if (status === "pending") return { tone: "warn" as const, label: t("status.pending"), icon: Clock4 };
    return { tone: "neutral" as const, label: status, icon: FileText };
  };

  const [leaveType, setLeaveType] = useState<"annual" | "sick" | "personal" | "other">("annual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const [otStart, setOtStart] = useState("");
  const [otEnd, setOtEnd] = useState("");
  const [otReason, setOtReason] = useState("");
  const [otHourlyRate, setOtHourlyRate] = useState("");
  const leaveMonthISO = leaveStart ? toMonthISO(new Date(leaveStart)) : toMonthISO(new Date());
  const currentBalance = db.leaveBalances.find(b => b.userId === userId && b.month === leaveMonthISO);
  const availablePaidLeaveDays = currentBalance?.closingBalanceDays ?? 0;
  const leaveStartISO = toISOFromLocal(leaveStart);
  const leaveEndISO = toISOFromLocal(leaveEnd);
  const requestedLeaveHours =
    leaveStartISO && leaveEndISO
      ? Math.max(0, Math.round(((new Date(leaveEndISO).getTime() - new Date(leaveStartISO).getTime()) / 36e5) * 2) / 2)
      : 0;
  const leaveDays = Math.max(0, requestedLeaveHours / 8);
  const expectedPaidDays = Math.min(leaveDays, availablePaidLeaveDays);
  const expectedUnpaidDays = Math.max(0, leaveDays - expectedPaidDays);

  const leaveList = useMemo(() => db.leaveRequests.filter(r => r.userId === userId), [db.leaveRequests, userId]);
  const otList = useMemo(() => db.overtimeRequests.filter(r => r.userId === userId), [db.overtimeRequests, userId]);
  const overtimeEstimate = useMemo(() => {
    const startISO = toISOFromLocal(otStart);
    const endISO = toISOFromLocal(otEnd);
    if (!startISO || !endISO) return 0;
    const me = db.users.find(u => u.id === userId);
    const baseSalaryCents = me?.baseSalaryCents ?? 0;
    const monthHours = 21.75 * 8;
    const baseHourlyRateCents = Math.round(baseSalaryCents / monthHours);
    const defaultHourlyRateCents = Math.round(baseHourlyRateCents * 1.5);
    const parsed = Number(otHourlyRate);
    const hourlyRateCents =
      Number.isFinite(parsed) && parsed > 0
        ? Math.round(parsed * 100)
        : typeof me?.overtimeHourlyRateCents === "number" && me.overtimeHourlyRateCents > 0
          ? me.overtimeHourlyRateCents
          : defaultHourlyRateCents;
    const hours = Math.max(0, Math.round((((new Date(endISO).getTime() - new Date(startISO).getTime()) / 36e5) * 2)) / 2);
    return Math.round(hours * hourlyRateCents);
  }, [db.users, otEnd, otHourlyRate, otStart, userId]);

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("employee.requests.title")}</div>
          <div className="mt-1 text-sm text-zinc-400">{t("employee.requests.subtitle")}</div>
        </div>
        <Tabs
          options={[
            { key: "leave", label: t("admin.approvals.leave") },
            { key: "overtime", label: t("admin.approvals.overtime") },
          ]}
          value={tab}
          onChange={k => setTab(k as "leave" | "overtime")}
        />
      </div>

      {tab === "leave" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("employee.requests.leaveSubmit")}</CardTitle>
              <CardDescription>{t("employee.requests.leaveSubmitDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("employee.requests.leaveType")}</div>
                  <Select value={leaveType} onChange={e => setLeaveType(e.target.value as any)}>
                    <option value="annual">{t("leave.annual")}</option>
                    <option value="sick">{t("leave.sick")}</option>
                    <option value="personal">{t("leave.personal")}</option>
                    <option value="other">{t("leave.other")}</option>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("employee.requests.leaveStart")}</div>
                  <Input type="datetime-local" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("employee.requests.leaveEnd")}</div>
                  <Input type="datetime-local" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("employee.requests.leaveReason")}</div>
                  <Textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder={t("employee.requests.leaveReasonPH")} />
                </div>

                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("employee.requests.leaveBalanceHint")}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-100">
                    {t("employee.requests.leaveBalanceValue", { days: availablePaidLeaveDays })}
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    {t("employee.requests.leaveEstimateHint", {
                      paid: expectedPaidDays,
                      unpaid: expectedUnpaidDays,
                    })}
                  </div>
                </div>

                {submitError ? <div className="text-sm text-rose-300">{t(submitError)}</div> : null}

                <div className="flex justify-end">
                  <Button
                    onClick={async () => {
                      const startISO = leaveStartISO;
                      const endISO = leaveEndISO;
                      if (!startISO || !endISO) return;
                      const hours = Math.max(0.5, requestedLeaveHours);
                      setSubmitError(null);
                      try {
                        await db.submitLeave({
                          userId: userId!,
                          leaveType,
                          startISO,
                          endISO,
                          hours,
                          reason: leaveReason.trim() || "—",
                        });
                        setLeaveStart("");
                        setLeaveEnd("");
                        setLeaveReason("");
                      } catch (error) {
                        setSubmitError(getRequestSubmitErrorKey(error));
                      }
                    }}
                    disabled={!leaveStart || !leaveEnd}
                  >
                    {t("action.submit")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("employee.requests.leaveMine")}</CardTitle>
              <CardDescription>{t("employee.requests.leaveMineDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                {leaveList.length ? (
                  leaveList.map(r => {
                    const meta = statusTone(r.status);
                    const Icon = meta.icon;
                    return (
                      <div key={r.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-100">
                              {r.leaveType === "annual" ? t("leave.annual") : r.leaveType === "sick" ? t("leave.sick") : r.leaveType === "personal" ? t("leave.personal") : t("leave.other")}
                              <span className="ml-2 text-xs text-zinc-500">
                                {r.hours} {t("common.hours")}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-400">
                              {formatDateCN(r.startISO)} - {formatDateCN(r.endISO)}
                            </div>
                            <div className="mt-2 text-xs text-zinc-500 line-clamp-2">{r.reason}</div>
                          </div>
                          <Badge tone={meta.tone} className="shrink-0">
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </Badge>
                        </div>
                        {r.reviewNote ? <div className="mt-3 text-xs text-zinc-400">{t("employee.requests.reviewNote", { note: r.reviewNote })}</div> : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("employee.requests.noRecords")}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("employee.requests.overtimeSubmit")}</CardTitle>
              <CardDescription>{t("employee.requests.overtimeSubmitDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("employee.requests.overtimeStart")}</div>
                  <Input type="datetime-local" value={otStart} onChange={e => setOtStart(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("employee.requests.overtimeEnd")}</div>
                  <Input type="datetime-local" value={otEnd} onChange={e => setOtEnd(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("employee.requests.overtimeReason")}</div>
                  <Textarea value={otReason} onChange={e => setOtReason(e.target.value)} placeholder={t("employee.requests.overtimeReasonPH")} />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("employee.requests.overtimeHourlyRate")}</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={otHourlyRate}
                    onChange={e => setOtHourlyRate(e.target.value)}
                    placeholder={t("employee.requests.overtimeHourlyRatePH")}
                  />
                  <div className="text-xs text-zinc-500">{t("employee.requests.overtimeHourlyRateHint")}</div>
                </div>

                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("employee.requests.overtimeEstimate")}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-100">
                    {formatCNYFromCents(overtimeEstimate)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{t("employee.requests.overtimeEstimateHint")}</div>
                </div>

                {submitError ? <div className="text-sm text-rose-300">{t(submitError)}</div> : null}

                <div className="flex justify-end">
                  <Button
                    onClick={async () => {
                      const startISO = toISOFromLocal(otStart);
                      const endISO = toISOFromLocal(otEnd);
                      if (!startISO || !endISO) return;
                      const rate = Number(otHourlyRate);
                      const hourlyRateCents = Number.isFinite(rate) && rate > 0 ? Math.round(rate * 100) : undefined;
                      setSubmitError(null);
                      try {
                        await db.submitOvertime({
                          userId: userId!,
                          startISO,
                          endISO,
                          reason: otReason.trim() || "—",
                          hourlyRateCents,
                        });
                        setOtStart("");
                        setOtEnd("");
                        setOtReason("");
                        setOtHourlyRate("");
                      } catch (error) {
                        setSubmitError(getRequestSubmitErrorKey(error));
                      }
                    }}
                    disabled={!otStart || !otEnd}
                  >
                    {t("action.submit")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("employee.requests.overtimeMine")}</CardTitle>
              <CardDescription>{t("employee.requests.overtimeMineDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                {otList.length ? (
                  otList.map(r => {
                    const meta = statusTone(r.status);
                    const Icon = meta.icon;
                    return (
                      <div key={r.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-100">
                              {r.hours} {t("common.hours")}
                              <span className="ml-2 text-xs text-zinc-500">{formatCNYFromCents(r.overtimePayCents)}</span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-400">
                              {formatDateCN(r.startISO)} - {formatDateCN(r.endISO)}
                            </div>
                            <div className="mt-2 text-xs text-zinc-500 line-clamp-2">{r.reason}</div>
                          </div>
                          <Badge tone={meta.tone} className="shrink-0">
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </Badge>
                        </div>
                        {r.reviewNote ? <div className="mt-3 text-xs text-zinc-400">{t("employee.requests.reviewNote", { note: r.reviewNote })}</div> : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("employee.requests.noRecords")}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
