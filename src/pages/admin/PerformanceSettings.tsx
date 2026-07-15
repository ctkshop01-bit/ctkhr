import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDbStore } from "@/stores/dbStore";
import { useT } from "@/i18n/useT";

type DraftState = {
  enabled: boolean;
  scoreBase: string;
  kpiBaseDefault: string;
  fullAttendanceBonus: string;
  allCompletedBonus: string;
  unfinishedTier1Penalty: string;
  unfinishedTier2Penalty: string;
  unfinishedTier3Penalty: string;
  taskUnfinishedThreshold: string;
  secondWarningPenalty: string;
  thirdWarningPenalty: string;
};

function createDraft(db: ReturnType<typeof useDbStore.getState>): DraftState {
  return {
    enabled: db.performanceSettings.enabled,
    scoreBase: String(db.performanceSettings.scoreBase),
    kpiBaseDefault: (db.performanceSettings.kpiBaseDefaultCents / 100).toFixed(2),
    fullAttendanceBonus: String(db.performanceSettings.fullAttendanceBonus),
    allCompletedBonus: String(db.performanceSettings.taskRules.allCompletedBonus),
    unfinishedTier1Penalty: String(db.performanceSettings.taskRules.unfinishedTier1Penalty),
    unfinishedTier2Penalty: String(db.performanceSettings.taskRules.unfinishedTier2Penalty),
    unfinishedTier3Penalty: String(db.performanceSettings.taskRules.unfinishedTier3Penalty),
    taskUnfinishedThreshold: String(db.performanceSettings.warningRules.taskUnfinishedThreshold),
    secondWarningPenalty: String(db.performanceSettings.warningRules.secondWarningPenalty),
    thirdWarningPenalty: String(db.performanceSettings.warningRules.thirdWarningPenalty),
  };
}

export default function PerformanceSettings() {
  const db = useDbStore();
  const t = useT();
  const [draft, setDraft] = useState(() => createDraft(useDbStore.getState()));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setDraft(createDraft(db));
  }, [db.performanceSettings]);

  const updateField = (key: keyof DraftState, value: string | boolean) => {
    setDraft(current => ({ ...current, [key]: value }));
    setSaveState("idle");
  };

  return (
    <div className="grid gap-4 pb-24 lg:pb-0">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t("admin.performanceSettings.title")}</CardTitle>
          <CardDescription>{t("admin.performanceSettings.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
            <div>
              <div className="text-sm font-medium text-zinc-100">{t("admin.performanceSettings.enabled")}</div>
              <div className="mt-1 text-xs text-zinc-500">{t("admin.performanceSettings.enabledDesc")}</div>
            </div>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={e => updateField("enabled", e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3 rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
              <div className="text-sm font-medium text-zinc-100">{t("admin.performanceSettings.scoreGroup")}</div>
              <div className="grid gap-2">
                <div className="text-xs text-zinc-500">{t("admin.performanceSettings.scoreBase")}</div>
                <Input value={draft.scoreBase} onChange={e => updateField("scoreBase", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-zinc-500">{t("admin.performanceSettings.fullAttendanceBonus")}</div>
                <Input value={draft.fullAttendanceBonus} onChange={e => updateField("fullAttendanceBonus", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-zinc-500">{t("admin.performanceSettings.kpiBaseDefault")}</div>
                <Input value={draft.kpiBaseDefault} onChange={e => updateField("kpiBaseDefault", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
              <div className="text-sm font-medium text-zinc-100">{t("admin.performanceSettings.taskGroup")}</div>
              <div className="grid gap-2">
                <div className="text-xs text-zinc-500">{t("admin.performanceSettings.allCompletedBonus")}</div>
                <Input value={draft.allCompletedBonus} onChange={e => updateField("allCompletedBonus", e.target.value)} />
              </div>
              <div className="grid gap-2 lg:grid-cols-3">
                <Input value={draft.unfinishedTier1Penalty} onChange={e => updateField("unfinishedTier1Penalty", e.target.value)} />
                <Input value={draft.unfinishedTier2Penalty} onChange={e => updateField("unfinishedTier2Penalty", e.target.value)} />
                <Input value={draft.unfinishedTier3Penalty} onChange={e => updateField("unfinishedTier3Penalty", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-zinc-500">{t("admin.performanceSettings.unfinishedPenaltyHelp")}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3 rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
              <div className="text-sm font-medium text-zinc-100">{t("admin.performanceSettings.warningGroup")}</div>
              <div className="grid gap-2">
                <div className="text-xs text-zinc-500">{t("admin.performanceSettings.taskUnfinishedThreshold")}</div>
                <Input value={draft.taskUnfinishedThreshold} onChange={e => updateField("taskUnfinishedThreshold", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-zinc-500">{t("admin.performanceSettings.secondWarningPenalty")}</div>
                <Input value={draft.secondWarningPenalty} onChange={e => updateField("secondWarningPenalty", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-zinc-500">{t("admin.performanceSettings.thirdWarningPenalty")}</div>
                <Input value={draft.thirdWarningPenalty} onChange={e => updateField("thirdWarningPenalty", e.target.value)} />
              </div>
            </div>

            <div className="flex items-end justify-between gap-3 rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
              <div className="text-xs text-zinc-500">
                {saveState === "saved"
                  ? t("admin.performanceSettings.saved")
                  : saveState === "error"
                    ? t("admin.performanceSettings.saveError")
                    : t("admin.performanceSettings.saveHint")}
              </div>
              <Button
                onClick={async () => {
                  setSaveState("saving");
                  try {
                    await db.updatePerformanceSettings({
                      enabled: draft.enabled,
                      scoreBase: Number(draft.scoreBase) || db.performanceSettings.scoreBase,
                      kpiBaseDefaultCents:
                        Math.round((Number(draft.kpiBaseDefault) || db.performanceSettings.kpiBaseDefaultCents / 100) * 100),
                      fullAttendanceBonus: Number(draft.fullAttendanceBonus) || db.performanceSettings.fullAttendanceBonus,
                      taskRules: {
                        allCompletedBonus: Number(draft.allCompletedBonus) || db.performanceSettings.taskRules.allCompletedBonus,
                        unfinishedTier1Penalty:
                          Number(draft.unfinishedTier1Penalty) || db.performanceSettings.taskRules.unfinishedTier1Penalty,
                        unfinishedTier2Penalty:
                          Number(draft.unfinishedTier2Penalty) || db.performanceSettings.taskRules.unfinishedTier2Penalty,
                        unfinishedTier3Penalty:
                          Number(draft.unfinishedTier3Penalty) || db.performanceSettings.taskRules.unfinishedTier3Penalty,
                        afterClockOutPenalty: db.performanceSettings.taskRules.afterClockOutPenalty,
                        returnPenalty: db.performanceSettings.taskRules.returnPenalty,
                        multiReturnExtraPenalty: db.performanceSettings.taskRules.multiReturnExtraPenalty,
                      },
                      warningRules: {
                        lateThreshold: db.performanceSettings.warningRules.lateThreshold,
                        earlyLeaveThreshold: db.performanceSettings.warningRules.earlyLeaveThreshold,
                        taskUnfinishedThreshold:
                          Number(draft.taskUnfinishedThreshold) || db.performanceSettings.warningRules.taskUnfinishedThreshold,
                        secondWarningPenalty:
                          Number(draft.secondWarningPenalty) || db.performanceSettings.warningRules.secondWarningPenalty,
                        thirdWarningPenalty:
                          Number(draft.thirdWarningPenalty) || db.performanceSettings.warningRules.thirdWarningPenalty,
                      },
                    });
                    setSaveState("saved");
                  } catch {
                    setSaveState("error");
                  }
                }}
              >
                {saveState === "saving" ? t("admin.performanceSettings.saving") : t("action.save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
