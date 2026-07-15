import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { formatDateCN } from "@/utils/core";
import { useT } from "@/i18n/useT";

function getNotificationTarget(relatedType: string) {
  if (relatedType === "leave" || relatedType === "overtime") return "/app/requests";
  if (relatedType === "attendance") return "/app/attendance";
  if (relatedType === "announcement") return "/app/announcements";
  if (relatedType === "task") return "/app/tasks";
  return "/app";
}

export default function EmployeeNotifications() {
  const navigate = useNavigate();
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();

  const items = useMemo(
    () =>
      db.notifications
        .filter(n => n.userId === userId)
        .slice()
        .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1)),
    [db.notifications, userId],
  );

  const unreadCount = items.filter(item => !item.isRead).length;

  const openNotification = async (id: string, relatedType: string, isRead: boolean) => {
    if (userId && !isRead) {
      await db.markNotificationRead(userId, id);
    }
    navigate(getNotificationTarget(relatedType));
  };

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("employee.notifications.title")}</div>
          <div className="mt-1 text-sm text-zinc-400">{t("employee.notifications.subtitle")}</div>
        </div>
        <Button variant="secondary" onClick={() => userId && db.markAllNotificationsRead(userId)} disabled={!unreadCount}>
          <CheckCheck className="h-4 w-4" />
          {t("employee.notifications.markAllRead")}
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-300" />
            {t("employee.notifications.inbox")}
          </CardTitle>
          <CardDescription>{t("employee.notifications.unreadCount", { count: unreadCount })}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length ? (
            <div className="grid gap-3">
              {items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-left transition hover:bg-zinc-900/30"
                  onClick={() => {
                    void openNotification(item.id, item.relatedType, item.isRead);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-zinc-100">{item.title}</div>
                        <Badge tone={item.isRead ? "neutral" : "good"}>{item.isRead ? t("status.read") : t("status.unread")}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">{item.body}</div>
                    </div>
                    <div className="shrink-0 text-xs text-zinc-500">{formatDateCN(item.createdAtISO)}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/20 px-4 py-8 text-center text-sm text-zinc-500">
              {t("employee.notifications.empty")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
