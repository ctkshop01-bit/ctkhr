import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDbStore } from "@/stores/dbStore";
import { useT } from "@/i18n/useT";

const emptyApprovalSettings = {
  leaveReviewerUserId: null,
  overtimeReviewerUserId: null,
  attendanceReviewerUserId: null,
} as const;

const reviewerSections = [
  { key: "leave", settingKey: "leaveReviewerUserId", labelKey: "admin.approvals.leave" },
  { key: "overtime", settingKey: "overtimeReviewerUserId", labelKey: "admin.approvals.overtime" },
  { key: "attendance", settingKey: "attendanceReviewerUserId", labelKey: "admin.approvals.abnormal" },
] as const;

export default function ApprovalSettings() {
  const db = useDbStore();
  const t = useT();
  const approvalSettings = db.approvalSettings ?? emptyApprovalSettings;
  const [draftSettings, setDraftSettings] = useState(approvalSettings);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const recentLogs = useMemo(
    () =>
      db.approvalLogs
        .slice()
        .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
        .slice(0, 6),
    [db.approvalLogs],
  );

  const activeReviewerOptions = useMemo(
    () => db.users.filter(user => user.status === "active"),
    [db.users],
  );

  const invalidSections = useMemo(
    () =>
      reviewerSections.filter(section => {
        const reviewerUserId = approvalSettings[section.settingKey];
        if (!reviewerUserId) return false;
        return !db.users.some(user => user.id === reviewerUserId && user.status === "active");
      }),
    [approvalSettings, db.users],
  );

  const isDirty = reviewerSections.some(
    section => draftSettings[section.settingKey] !== approvalSettings[section.settingKey],
  );

  useEffect(() => {
    setDraftSettings(approvalSettings);
  }, [
    approvalSettings.leaveReviewerUserId,
    approvalSettings.overtimeReviewerUserId,
    approvalSettings.attendanceReviewerUserId,
  ]);

  const getUserName = (userId: string | null) => {
    if (!userId) return t("admin.approvalSettings.unset");
    return db.users.find(user => user.id === userId)?.name ?? t("admin.approvalSettings.unset");
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t("admin.approvalSettings.title")}</CardTitle>
          <CardDescription>{t("admin.approvalSettings.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0">
          <div className="grid gap-3 md:grid-cols-3">
            {reviewerSections.map(section => (
              <div key={section.key} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-500">{t(section.labelKey)}</div>
                <select
                  className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
                  value={draftSettings[section.settingKey] ?? ""}
                  onChange={e => {
                    const nextValue = e.target.value || null;
                    setDraftSettings(current => ({ ...current, [section.settingKey]: nextValue }));
                    setSaveState("idle");
                  }}
                >
                  <option value="">{t("admin.approvalSettings.unset")}</option>
                  {activeReviewerOptions.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.username})
                    </option>
                  ))}
                </select>
                <div className="mt-3 text-xs text-zinc-500">
                  {t("admin.approvalSettings.currentReviewer", {
                    reviewer: getUserName(approvalSettings[section.settingKey]),
                  })}
                </div>
                {invalidSections.some(item => item.key === section.key) ? (
                  <div className="mt-2 text-xs text-amber-300">{t("admin.approvalSettings.invalidConfigured")}</div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
            <div className="text-xs text-zinc-500">
              {saveState === "saved"
                ? t("admin.approvalSettings.saved")
                : saveState === "error"
                  ? t("admin.approvalSettings.saveError")
                  : t("admin.approvalSettings.saveHint")}
            </div>
            <Button
              type="button"
              disabled={!isDirty || saveState === "saving"}
              onClick={async () => {
                setSaveState("saving");
                try {
                  await db.updateApprovalSettings(draftSettings);
                  setSaveState("saved");
                } catch {
                  setSaveState("error");
                }
              }}
            >
              {saveState === "saving" ? t("admin.approvalSettings.saving") : t("admin.approvalSettings.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t("admin.approvalSettings.logTitle")}</CardTitle>
          <CardDescription>{t("admin.approvalSettings.logDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0">
          {recentLogs.length ? (
            recentLogs.map(log => (
              <div key={log.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-100">
                    {t(`admin.approvals.${log.requestType === "attendance" ? "abnormal" : log.requestType}`)}
                  </div>
                  <div className="text-xs text-zinc-500">{new Date(log.createdAtISO).toLocaleString()}</div>
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  {t("admin.approvalSettings.logLine", {
                    reviewer: getUserName(log.reviewerUserId),
                    decision: log.decision,
                  })}
                </div>
                {log.note ? <div className="mt-2 text-xs text-zinc-500">{log.note}</div> : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-sm text-zinc-500">
              {t("admin.approvalSettings.noLogs")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
