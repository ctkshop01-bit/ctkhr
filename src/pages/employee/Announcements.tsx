import { useMemo, useState } from "react";
import { Megaphone, Pin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { formatDateCN } from "@/utils/core";
import { useT } from "@/i18n/useT";

export default function EmployeeAnnouncements() {
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);

  const reads = useMemo(() => new Set(db.announcementReads.filter(r => r.userId === userId).map(r => r.announcementId)), [db.announcementReads, userId]);
  const list = useMemo(() => {
    const items = db.announcements.slice();
    items.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.createdAtISO < b.createdAtISO ? 1 : -1;
    });
    return items;
  }, [db.announcements]);

  const current = openId ? db.announcements.find(a => a.id === openId) : undefined;

  return (
    <div className="pb-24 lg:pb-0">
      <div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("employee.ann.title")}</div>
        <div className="mt-1 text-sm text-zinc-400">{t("employee.ann.subtitle")}</div>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-emerald-300" />
            {t("employee.ann.list")}
          </CardTitle>
          <CardDescription>{t("employee.ann.listDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3">
            {list.length ? (
              list.map(a => {
                const read = reads.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setOpenId(a.id);
                      db.markAnnouncementRead(a.id, userId!);
                    }}
                    className="text-left rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 hover:bg-zinc-900/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {a.pinned ? <Pin className="h-4 w-4 text-emerald-300" /> : null}
                          <div className="truncate text-sm font-semibold text-zinc-100">{a.title}</div>
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{a.content}</div>
                        <div className="mt-2 text-xs text-zinc-500">{formatDateCN(a.createdAtISO)}</div>
                      </div>
                      <Badge tone={read ? "neutral" : "warn"}>{read ? t("status.read") : t("status.unread")}</Badge>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">{t("employee.ann.noData")}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(current)}
        title={current?.title ?? t("employee.ann.title")}
        description={current ? formatDateCN(current.createdAtISO) : undefined}
        onClose={() => setOpenId(null)}
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setOpenId(null)}>
              {t("action.close")}
            </Button>
          </div>
        }
      >
        <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{current?.content}</div>
      </Dialog>
    </div>
  );
}
