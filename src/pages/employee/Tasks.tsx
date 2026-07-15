import { ClipboardList, CheckCircle2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { useT } from "@/i18n/useT";
import { buildLatestReviewByTaskId } from "./taskReviewLogs";

const taskStatusOrder: Record<string, number> = {
  returned: 0,
  overdue: 1,
  open: 2,
  submitted: 3,
  confirmed: 4,
  closed: 5,
};

export default function EmployeeTasks() {
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const list = db.tasks.slice().sort((a, b) => {
    const orderDelta = (taskStatusOrder[a.status] ?? 99) - (taskStatusOrder[b.status] ?? 99);
    if (orderDelta !== 0) return orderDelta;
    return a.createdAtISO < b.createdAtISO ? 1 : -1;
  });
  const latestReviewByTaskId = buildLatestReviewByTaskId(db.taskReviewLogs ?? []);

  const getStatusTone = (status: string) => {
    if (status === "confirmed" || status === "closed") return "good" as const;
    if (status === "returned" || status === "overdue") return "warn" as const;
    return "neutral" as const;
  };

  const getStatusLabel = (status: string) => {
    if (status === "submitted") return t("employee.tasks.submitted");
    if (status === "confirmed") return t("employee.tasks.confirmed");
    if (status === "returned") return t("employee.tasks.returned");
    if (status === "overdue") return t("employee.tasks.overdue");
    if (status === "closed") return t("employee.tasks.closed");
    return t("employee.tasks.open");
  };

  return (
    <div className="pb-24 lg:pb-0">
      <div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("employee.tasks.title")}</div>
        <div className="mt-1 text-sm text-zinc-400">{t("employee.tasks.subtitle")}</div>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-emerald-300" />
            {t("employee.tasks.list")}
          </CardTitle>
          <CardDescription>{t("employee.tasks.listDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3">
            {list.length ? (
              list.map(task => {
                const latestReview = latestReviewByTaskId.get(task.id);
                return (
                  <div key={task.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">{task.title}</div>
                        {task.description ? <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{task.description}</div> : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge tone={task.taskType === "same_day" ? "warn" : "neutral"}>
                            {task.taskType === "same_day" ? t("employee.tasks.sameDay") : t("employee.tasks.normalTask")}
                          </Badge>
                          <Badge tone={getStatusTone(task.status)}>{getStatusLabel(task.status)}</Badge>
                          {task.includeInPerformance !== false ? <Badge tone="good">{t("employee.tasks.inPerformance")}</Badge> : null}
                        </div>
                        {task.lastReturnReason ? (
                          <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                            <div className="flex items-center gap-2">
                              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                              <span>{t("employee.tasks.returnReason", { reason: task.lastReturnReason })}</span>
                            </div>
                          </div>
                        ) : null}
                        {latestReview ? (
                          <div className="mt-3 rounded-2xl border border-zinc-900/60 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300">
                            <div className="font-medium text-zinc-100">
                              {t("employee.tasks.latestReview")}: {getStatusLabel(latestReview.toStatus)}
                            </div>
                            <div className="mt-1 text-zinc-500">
                              {t("employee.tasks.latestReviewedAt")}: {new Date(latestReview.createdAtISO).toLocaleString()}
                            </div>
                            {latestReview.reason ? <div className="mt-1 text-amber-100">{latestReview.reason}</div> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={task.status === "submitted" || task.status === "confirmed" ? "secondary" : "primary"}
                          size="sm"
                          onClick={() => {
                            if (!userId) return;
                            void db.submitTaskCompletion(task.id, userId);
                          }}
                          disabled={!userId || task.status === "confirmed" || task.status === "closed"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {task.status === "confirmed"
                            ? t("employee.tasks.confirmed")
                            : task.status === "submitted"
                              ? t("employee.tasks.submitted")
                              : t("employee.tasks.submit")}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("employee.tasks.noData")}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
