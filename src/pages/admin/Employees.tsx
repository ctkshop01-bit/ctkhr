import { useMemo, useState } from "react";
import { Edit3, Plus, Search, UserX } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Dialog from "@/components/ui/Dialog";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { useDbStore } from "@/stores/dbStore";
import { createId, formatCNYFromCents, toMonthISO } from "@/utils/core";
import { useT } from "@/i18n/useT";
import type { EmploymentType } from "@/types/domain";

type FormState = {
  id: string;
  username: string;
  name: string;
  department: string;
  title: string;
  baseSalary: string;
  overtimeHourlyRate: string;
  employmentType: EmploymentType;
  monthlyPaidLeaveDays: string;
  status: "active" | "inactive";
  password?: string;
};

function defaultMonthlyPaidLeaveDays(employmentType: EmploymentType) {
  return employmentType === "probation" ? "0" : "4";
}

function emptyForm(): FormState {
  return {
    id: createId("usr"),
    username: "",
    name: "",
    department: "",
    title: "",
    baseSalary: "15000",
    overtimeHourlyRate: "",
    employmentType: "regular",
    monthlyPaidLeaveDays: defaultMonthlyPaidLeaveDays("regular"),
    status: "active",
    password: "123456",
  };
}

export default function AdminEmployees() {
  const db = useDbStore();
  const { users, upsertEmployee, setUserStatus, loadSharedSnapshot, leaveBalances } = db;
  const t = useT();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const monthISO = toMonthISO(new Date());

  const list = useMemo(() => {
    const items = users.filter(u => u.role === "employee").slice();
    const kw = q.trim().toLowerCase();
    if (kw) {
      return items.filter(u => [u.username, u.name, u.department ?? "", u.title ?? ""].some(v => v.toLowerCase().includes(kw)));
    }
    return items;
  }, [users, q]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("admin.employees.title")}</div>
          <div className="mt-1 text-sm text-zinc-400">{t("admin.employees.subtitle")}</div>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("admin.employees.add")}
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-300" />
            {t("admin.employees.list")}
          </CardTitle>
          <CardDescription>{t("admin.employees.listDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-4">
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("admin.employees.searchPH")} />
          </div>

          <Table>
            <thead>
              <tr>
                <Th>{t("admin.employees.colUsername")}</Th>
                <Th>{t("admin.employees.colName")}</Th>
                <Th>{t("admin.employees.colDeptTitle")}</Th>
                <Th className="text-right">{t("admin.employees.colBaseSalary")}</Th>
                <Th className="text-right">{t("admin.employees.colOvertimeRate")}</Th>
                <Th>{t("admin.employees.colStatus")}</Th>
                <Th className="text-right">{t("admin.employees.colActions")}</Th>
              </tr>
            </thead>
            <tbody>
              {list.map(u => (
                (() => {
                  const currentLeaveBalance = leaveBalances.find(b => b.userId === u.id && b.month === monthISO);

                  return (
                    <Tr key={u.id}>
                      <Td className="font-medium text-zinc-100">{u.username}</Td>
                      <Td>{u.name}</Td>
                      <Td className="text-zinc-300">
                        <div className="text-sm">{u.department ?? "—"}</div>
                        <div className="mt-0.5 text-xs text-zinc-500">{u.title ?? "—"}</div>
                        <div className="mt-2 text-xs text-emerald-300">
                          {t("admin.employees.leaveBalanceSummary", {
                            days: currentLeaveBalance?.closingBalanceDays ?? 0,
                            carried: currentLeaveBalance?.carriedDays ?? 0,
                          })}
                        </div>
                      </Td>
                      <Td className="text-right">{formatCNYFromCents(u.baseSalaryCents)}</Td>
                      <Td className="text-right">
                        {typeof u.overtimeHourlyRateCents === "number" && u.overtimeHourlyRateCents > 0 ? formatCNYFromCents(u.overtimeHourlyRateCents) : "—"}
                      </Td>
                      <Td>
                        <Badge tone={u.status === "active" ? "good" : "neutral"}>{u.status === "active" ? t("admin.employees.statusActive") : t("admin.employees.statusInactive")}</Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setForm({
                                id: u.id,
                                username: u.username,
                                name: u.name,
                                department: u.department ?? "",
                                title: u.title ?? "",
                                baseSalary: (u.baseSalaryCents / 100).toFixed(2),
                                overtimeHourlyRate: typeof u.overtimeHourlyRateCents === "number" && u.overtimeHourlyRateCents > 0 ? (u.overtimeHourlyRateCents / 100).toFixed(2) : "",
                                employmentType: u.employmentType ?? "regular",
                                monthlyPaidLeaveDays: String(u.monthlyPaidLeaveDays ?? defaultMonthlyPaidLeaveDays(u.employmentType ?? "regular")),
                                status: u.status,
                              });
                              setOpen(true);
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                            {t("admin.employees.edit")}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={async () => {
                              await setUserStatus(u.id, u.status === "active" ? "inactive" : "active");
                              await loadSharedSnapshot();
                            }}
                          >
                            <UserX className="h-4 w-4" />
                            {u.status === "active" ? t("admin.employees.disable") : t("admin.employees.enable")}
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })()
              ))}
            </tbody>
          </Table>

          {!list.length ? <div className="mt-4 text-sm text-zinc-500">{t("admin.employees.noMatch")}</div> : null}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        title={users.some(u => u.id === form.id) ? t("admin.employees.dialogEdit") : t("admin.employees.dialogAdd")}
        description={t("admin.employees.dialogDesc")}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              disabled={saving || !form.username.trim() || !form.name.trim()}
              onClick={async () => {
                setSaving(true);
                try {
                  const baseSalary = Number(form.baseSalary);
                  const baseSalaryCents = Number.isFinite(baseSalary) && baseSalary >= 0 ? Math.round(baseSalary * 100) : 0;
                  const rate = Number(form.overtimeHourlyRate);
                  const overtimeHourlyRateCents = Number.isFinite(rate) && rate > 0 ? Math.round(rate * 100) : undefined;
                  const leaveDays = Number(form.monthlyPaidLeaveDays);
                  const monthlyPaidLeaveDays = Number.isFinite(leaveDays) ? Math.max(0, Math.round(leaveDays)) : 0;
                  await upsertEmployee({
                    id: form.id,
                    username: form.username.trim(),
                    name: form.name.trim(),
                    department: form.department.trim() || undefined,
                    title: form.title.trim() || undefined,
                    baseSalaryCents,
                    overtimeHourlyRateCents,
                    employmentType: form.employmentType,
                    monthlyPaidLeaveDays,
                    status: form.status,
                    password: form.password?.trim() || undefined,
                  });
                  await loadSharedSnapshot();
                  setOpen(false);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {t("action.save")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.colUsername")}</div>
            <Input value={form.username} onChange={e => setForm(s => ({ ...s, username: e.target.value }))} placeholder={t("admin.employees.usernamePH")} />
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.colName")}</div>
            <Input value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} placeholder={t("admin.employees.namePH")} />
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.deptPH")}</div>
            <Input value={form.department} onChange={e => setForm(s => ({ ...s, department: e.target.value }))} placeholder={t("admin.employees.deptPH")} />
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.titlePH")}</div>
            <Input value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} placeholder={t("admin.employees.titlePH")} />
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.salaryCents")}</div>
            <Input
              type="number"
              step="0.01"
              value={form.baseSalary}
              onChange={e => setForm(s => ({ ...s, baseSalary: e.target.value }))}
            />
            <div className="text-xs text-zinc-500">{t("admin.employees.salaryHint")}</div>
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.overtimeRate")}</div>
            <Input
              type="number"
              step="0.01"
              value={form.overtimeHourlyRate}
              onChange={e => setForm(s => ({ ...s, overtimeHourlyRate: e.target.value }))}
              placeholder={t("admin.employees.overtimeRatePH")}
            />
            <div className="text-xs text-zinc-500">{t("admin.employees.overtimeRateHint")}</div>
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.employmentType")}</div>
            <Select
              value={form.employmentType}
              onChange={e => {
                const employmentType = e.target.value as EmploymentType;
                setForm(s => ({
                  ...s,
                  employmentType,
                  monthlyPaidLeaveDays: defaultMonthlyPaidLeaveDays(employmentType),
                }));
              }}
            >
              <option value="regular">{t("admin.employees.employmentTypeRegular")}</option>
              <option value="probation">{t("admin.employees.employmentTypeProbation")}</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.monthlyPaidLeaveDays")}</div>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.monthlyPaidLeaveDays}
              onChange={e => setForm(s => ({ ...s, monthlyPaidLeaveDays: e.target.value }))}
            />
            <div className="text-xs text-zinc-500">{t("admin.employees.monthlyPaidLeaveDaysHint")}</div>
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.status")}</div>
            <Select value={form.status} onChange={e => setForm(s => ({ ...s, status: e.target.value as any }))}>
              <option value="active">{t("admin.employees.statusActive")}</option>
              <option value="inactive">{t("admin.employees.statusInactive")}</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("admin.employees.resetPwd")}</div>
            <Input value={form.password ?? ""} onChange={e => setForm(s => ({ ...s, password: e.target.value }))} placeholder={t("admin.employees.resetPwdPH")} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
