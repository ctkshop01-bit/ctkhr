import { useMemo, useState } from "react";
import { ArrowRight, ClipboardCheck, Gauge, Megaphone, Plus, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDbStore } from "@/stores/dbStore";
import { formatDateCN, monthISOFromDateTimeISO, toDateISO, toMonthISO } from "@/utils/core";
import { useT } from "@/i18n/useT";

export default function AdminDashboard() {
  const db = useDbStore();
  const t = useT();
  const todayISO = toDateISO(new Date());
  const monthISO = toMonthISO(new Date());

  const totalEmployees = db.users.filter(u => u.role === "employee");
  const activeEmployees = totalEmployees.filter(u => u.status === "active");
  const todayRecords = db.attendanceDaily.filter(a => a.dateISO === todayISO);

  const attendanceRate = activeEmployees.length
    ? Math.round((todayRecords.filter(a => a.status !== "missing").length / activeEmployees.length) * 100)
    : 0;

  const abnormalCount = db.attendanceDaily.filter(a => ["late", "early_leave", "missing"].includes(a.status) && !a.confirmed).length;
  const pendingLeave = db.leaveRequests.filter(r => r.status === "pending").length;
  const pendingOvertime = db.overtimeRequests.filter(r => r.status === "pending").length;

  const overtimeHoursThisMonth = useMemo(
    () =>
      db.overtimeRequests
        .filter(r => r.status === "approved" && monthISOFromDateTimeISO(r.startISO) === monthISO)
        .reduce((sum, r) => sum + r.hours, 0),
    [db.overtimeRequests, monthISO],
  );

  const [annOpen, setAnnOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskType, setTaskType] = useState<"same_day" | "normal">("same_day");

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-400">{formatDateCN(new Date().toISOString())}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">{t("admin.dashboard.title")}</div>
          <div className="mt-1 text-sm text-zinc-400">{t("admin.dashboard.subtitle")}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setAnnOpen(true)}>
            <Megaphone className="h-4 w-4" />
            {t("admin.dashboard.publishAnn")}
          </Button>
          <Button onClick={() => setTaskOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("admin.dashboard.newTask")}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              {t("admin.dashboard.attendanceRate")}
            </CardTitle>
            <CardDescription>{t("admin.dashboard.attendanceRateDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-end justify-between gap-3">
              <div className="text-5xl font-semibold tracking-tight text-zinc-100">{attendanceRate}%</div>
              <div className="text-sm text-zinc-400">
                {t("admin.dashboard.staffLine", {
                  active: activeEmployees.length,
                  clocked: todayRecords.filter(a => a.status !== "missing").length,
                })}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={abnormalCount ? "warn" : "good"}>{t("admin.dashboard.abnormalBadge", { count: abnormalCount })}</Badge>
              <Badge tone={pendingLeave + pendingOvertime ? "warn" : "good"}>{t("admin.dashboard.pendingBadge", { count: pendingLeave + pendingOvertime })}</Badge>
              <Badge tone="neutral">{t("admin.dashboard.overtimeBadge", { hours: overtimeHoursThisMonth })}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-300" />
              {t("admin.dashboard.employees")}
            </CardTitle>
            <CardDescription>{t("admin.dashboard.employeesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-4xl font-semibold text-zinc-100">{totalEmployees.length}</div>
            <div className="mt-1 text-xs text-zinc-500">{t("admin.dashboard.employeesMeta", { total: totalEmployees.length, active: activeEmployees.length })}</div>
            <div className="mt-4">
              <Link to="/admin/employees">
                <Button variant="secondary" className="w-full">
                  {t("admin.dashboard.enterEmployees")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-300" />
              {t("admin.dashboard.approvals")}
            </CardTitle>
            <CardDescription>{t("admin.dashboard.approvalsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-4xl font-semibold text-zinc-100">{pendingLeave + pendingOvertime}</div>
            <div className="mt-1 text-xs text-zinc-500">{t("admin.dashboard.pendingCount")}</div>
            <div className="mt-4">
              <Link to="/admin/approvals">
                <Button variant="secondary" className="w-full">
                  {t("admin.dashboard.enterApprovals")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-emerald-300" />
              {t("admin.performance.title")}
            </CardTitle>
            <CardDescription>{t("admin.performance.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0">
            <Link to="/admin/performance-dashboard">
              <Button variant="secondary" className="w-full justify-between">
                {t("nav.performanceDashboard")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/admin/performance-settings">
              <Button variant="secondary" className="w-full justify-between">
                {t("nav.performanceSettings")}
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={annOpen}
        title={t("admin.dashboard.annDialogTitle")}
        description={t("admin.dashboard.annDialogDesc")}
        onClose={() => setAnnOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAnnOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!annTitle.trim() || !annContent.trim()) return;
                db.upsertAnnouncement({ title: annTitle.trim(), content: annContent.trim(), pinned: false });
                setAnnTitle("");
                setAnnContent("");
                setAnnOpen(false);
              }}
            >
              {t("action.publish")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("common.title")}</div>
            <Input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder={t("admin.dashboard.titlePH")} />
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("common.content")}</div>
            <Textarea value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder={t("admin.dashboard.contentPH")} />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={taskOpen}
        title={t("admin.dashboard.taskDialogTitle")}
        description={t("admin.dashboard.taskDialogDesc")}
        onClose={() => setTaskOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTaskOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!taskTitle.trim()) return;
                db.upsertTask({
                  title: taskTitle.trim(),
                  description: taskDesc.trim() || undefined,
                  dueAtISO: undefined,
                  status: "open",
                  taskType,
                  includeInPerformance: taskType === "same_day",
                });
                setTaskTitle("");
                setTaskDesc("");
                setTaskType("same_day");
                setTaskOpen(false);
              }}
            >
              {t("action.create")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("common.title")}</div>
            <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder={t("admin.dashboard.taskTitlePH")} />
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.dashboard.taskType")}</div>
            <Select value={taskType} onChange={e => setTaskType(e.target.value as "same_day" | "normal")}>
              <option value="same_day">{t("employee.tasks.sameDay")}</option>
              <option value="normal">{t("employee.tasks.normalTask")}</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("common.description")}</div>
            <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder={t("admin.dashboard.taskDescPH")} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
