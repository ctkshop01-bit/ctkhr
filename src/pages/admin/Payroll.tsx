import { useMemo, useState } from "react";
import { Download, Calculator, Settings2, Trash2, Edit3 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Dialog from "@/components/ui/Dialog";
import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { useDbStore } from "@/stores/dbStore";
import { createId, formatCNYFromCents, toMonthISO } from "@/utils/core";
import { useT } from "@/i18n/useT";

export default function AdminPayroll() {
  const db = useDbStore();
  const t = useT();
  const [monthISO, setMonthISO] = useState(toMonthISO(new Date()));
  const [openRules, setOpenRules] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleReason, setNewRuleReason] = useState("");
  const [newRuleAmount, setNewRuleAmount] = useState("50");
  const [editId, setEditId] = useState<string | null>(null);
  const [payBase, setPayBase] = useState("");
  const [payOt, setPayOt] = useState("");
  const [payDed, setPayDed] = useState("");
  const [payNet, setPayNet] = useState("");

  const items = useMemo(() => db.payrollItems.filter(p => p.monthISO === monthISO), [db.payrollItems, monthISO]);
  const employees = useMemo(() => db.users.filter(u => u.role === "employee"), [db.users]);
  const nameOf = (id: string) => employees.find(u => u.id === id)?.name ?? "—";
  const openItem = useMemo(() => (editId ? items.find(p => p.id === editId) : undefined), [editId, items]);

  const exportCSV = () => {
    const header = [
      t("admin.payroll.colMonth"),
      t("admin.payroll.colUsername"),
      t("admin.payroll.colName"),
      t("admin.payroll.colBaseSalary"),
      t("admin.payroll.colOvertime"),
      t("admin.payroll.colDeductions"),
      t("admin.payroll.colNetPay"),
    ];
    const rows = items.map(p => {
      const user = employees.find(u => u.id === p.userId);
      return [
        p.monthISO,
        user?.username ?? "",
        user?.name ?? "",
        (p.baseSalaryCents / 100).toFixed(2),
        (p.overtimePayCents / 100).toFixed(2),
        (p.deductionsCents / 100).toFixed(2),
        (p.netPayCents / 100).toFixed(2),
      ];
    });
    const csvBody = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/\"/g, '\"\"')}"`).join(",")).join("\n");
    const csv = `\ufeff${csvBody}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${monthISO}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("admin.payroll.title")}</div>
          <div className="mt-1 text-sm text-zinc-400">{t("admin.payroll.subtitle")}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            value={monthISO}
            onChange={e => setMonthISO(e.target.value)}
            className="w-44"
          />
          <Button variant="secondary" onClick={() => setOpenRules(true)}>
            <Settings2 className="h-4 w-4" />
            {t("admin.payroll.rules")}
          </Button>
          <Button
            onClick={() => {
              db.generatePayroll(monthISO);
            }}
          >
            <Calculator className="h-4 w-4" />
            {t("action.generate")}
          </Button>
          <Button variant="secondary" disabled={!items.length} onClick={exportCSV}>
            <Download className="h-4 w-4" />
            {t("action.exportCsv")}
          </Button>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle>{t("admin.payroll.tableTitle")}</CardTitle>
          <CardDescription>{t("admin.payroll.tableDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <thead>
              <tr>
                <Th>{t("admin.payroll.colName")}</Th>
                <Th className="text-right">{t("admin.payroll.colBaseSalary")}</Th>
                <Th className="text-right">{t("admin.payroll.colOvertime")}</Th>
                <Th className="text-right">{t("admin.payroll.colDeductions")}</Th>
                <Th className="text-right">{t("admin.payroll.colNetShort")}</Th>
                <Th className="text-right">{t("admin.payroll.colActions")}</Th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <Tr key={p.id}>
                  <Td className="font-medium text-zinc-100">{nameOf(p.userId)}</Td>
                  <Td className="text-right">{formatCNYFromCents(p.baseSalaryCents)}</Td>
                  <Td className="text-right">{formatCNYFromCents(p.overtimePayCents)}</Td>
                  <Td className="text-right">{formatCNYFromCents(p.deductionsCents)}</Td>
                  <Td className="text-right font-semibold text-zinc-100">{formatCNYFromCents(p.netPayCents)}</Td>
                  <Td className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditId(p.id);
                        setPayBase((p.baseSalaryCents / 100).toFixed(2));
                        setPayOt((p.overtimePayCents / 100).toFixed(2));
                        setPayDed((p.deductionsCents / 100).toFixed(2));
                        setPayNet((p.netPayCents / 100).toFixed(2));
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                      {t("action.edit")}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {!items.length ? <div className="mt-4 text-sm text-zinc-500">{t("admin.payroll.noData")}</div> : null}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(openItem)}
        title={t("admin.payroll.editTitle")}
        description={openItem ? `${nameOf(openItem.userId)} · ${openItem.monthISO}` : undefined}
        onClose={() => setEditId(null)}
        footer={
          openItem ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditId(null)}>
                {t("action.cancel")}
              </Button>
              <Button
                onClick={() => {
                  const base = Number(payBase);
                  const ot = Number(payOt);
                  const ded = Number(payDed);
                  const net = Number(payNet);
                  const baseSalaryCents = Number.isFinite(base) ? Math.round(base * 100) : openItem.baseSalaryCents;
                  const overtimePayCents = Number.isFinite(ot) ? Math.round(ot * 100) : openItem.overtimePayCents;
                  const deductionsCents = Number.isFinite(ded) ? Math.round(ded * 100) : openItem.deductionsCents;
                  const netPayCents = Number.isFinite(net) ? Math.round(net * 100) : openItem.netPayCents;
                  db.updatePayrollItem(openItem.id, { baseSalaryCents, overtimePayCents, deductionsCents, netPayCents });
                  setEditId(null);
                }}
              >
                {t("action.save")}
              </Button>
            </div>
          ) : null
        }
      >
        {openItem ? (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.payroll.colBaseSalary")}</div>
              <Input
                type="number"
                step="0.01"
                value={payBase}
                onChange={e => {
                  const v = e.target.value;
                  setPayBase(v);
                  const base = Number(v);
                  const ot = Number(payOt);
                  const ded = Number(payDed);
                  if (!Number.isFinite(base) || !Number.isFinite(ot) || !Number.isFinite(ded)) return;
                  setPayNet((base + ot - ded).toFixed(2));
                }}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.payroll.colOvertime")}</div>
              <Input
                type="number"
                step="0.01"
                value={payOt}
                onChange={e => {
                  const v = e.target.value;
                  setPayOt(v);
                  const base = Number(payBase);
                  const ot = Number(v);
                  const ded = Number(payDed);
                  if (!Number.isFinite(base) || !Number.isFinite(ot) || !Number.isFinite(ded)) return;
                  setPayNet((base + ot - ded).toFixed(2));
                }}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.payroll.colDeductions")}</div>
              <Input
                type="number"
                step="0.01"
                value={payDed}
                onChange={e => {
                  const v = e.target.value;
                  setPayDed(v);
                  const base = Number(payBase);
                  const ot = Number(payOt);
                  const ded = Number(v);
                  if (!Number.isFinite(base) || !Number.isFinite(ot) || !Number.isFinite(ded)) return;
                  setPayNet((base + ot - ded).toFixed(2));
                }}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.payroll.colNetPay")}</div>
              <Input
                type="number"
                step="0.01"
                value={payNet}
                onChange={e => {
                  const v = e.target.value;
                  setPayNet(v);
                  const base = Number(payBase);
                  const ot = Number(payOt);
                  const net = Number(v);
                  if (!Number.isFinite(base) || !Number.isFinite(ot) || !Number.isFinite(net)) return;
                  setPayDed((base + ot - net).toFixed(2));
                }}
              />
            </div>
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/20 p-4">
              <div className="text-sm font-medium text-zinc-100">{t("admin.payroll.breakdown")}</div>
              <div className="mt-1 text-xs text-zinc-500">{t("admin.payroll.breakdownDesc")}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.paidLeaveDays")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">{openItem?.paidLeaveDays ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.unpaidLeaveDays")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">{openItem?.unpaidLeaveDays ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.unpaidLeaveDeduction")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">
                    {formatCNYFromCents(openItem?.unpaidLeaveDeductionCents ?? 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.missingDays")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">{openItem?.missingDays ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 sm:col-span-2">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.missingDeduction")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">
                    {formatCNYFromCents(openItem?.missingDeductionCents ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={openRules}
        title={t("admin.payroll.rulesTitle")}
        description={t("admin.payroll.rulesDesc")}
        onClose={() => setOpenRules(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenRules(false)}>
              {t("action.close")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <div className="text-xs font-medium text-zinc-300">{t("admin.payroll.ruleName")}</div>
                <Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} placeholder={t("admin.payroll.ruleNamePH")} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-medium text-zinc-300">{t("admin.payroll.ruleReason")}</div>
                <Input value={newRuleReason} onChange={e => setNewRuleReason(e.target.value)} placeholder={t("admin.payroll.ruleReasonPH")} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-medium text-zinc-300">{t("admin.payroll.amountCents")}</div>
                <Input type="number" step="0.01" value={newRuleAmount} onChange={e => setNewRuleAmount(e.target.value)} />
                <div className="text-xs text-zinc-500">{t("admin.payroll.amountHint")}</div>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={!newRuleName.trim()}
                  onClick={() => {
                    const n = Number(newRuleAmount);
                    db.upsertDeductionRule({
                      id: createId("rule"),
                      name: newRuleName.trim(),
                      reason: newRuleReason.trim() || undefined,
                      type: "custom",
                      amountCents: Number.isFinite(n) ? Math.round(n * 100) : 0,
                      enabled: true,
                    });
                    setNewRuleName("");
                    setNewRuleReason("");
                    setNewRuleAmount("50");
                  }}
                >
                  {t("admin.payroll.addRule")}
                </Button>
              </div>
            </div>
          </div>

          {db.deductionRules.map(r => (
            <div key={r.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-100">{r.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">{t("admin.payroll.ruleType", { type: r.type })}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.enabled ? "good" : "neutral"}>{r.enabled ? t("common.enabled") : t("common.disabled")}</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => db.upsertDeductionRule({ ...r, enabled: !r.enabled })}
                  >
                    {t("action.toggle")}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => db.deleteDeductionRule(r.id)}>
                    <Trash2 className="h-4 w-4" />
                    {t("action.delete")}
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <div className="text-xs text-zinc-400">{t("admin.payroll.ruleName")}</div>
                <Input value={r.name} onChange={e => db.upsertDeductionRule({ ...r, name: e.target.value })} />
                <div className="text-xs text-zinc-400">{t("admin.payroll.ruleReason")}</div>
                <Input value={r.reason ?? ""} onChange={e => db.upsertDeductionRule({ ...r, reason: e.target.value || undefined })} />
                <div className="text-xs text-zinc-400">{t("admin.payroll.amountCents")}</div>
                <Input
                  type="number"
                  step="0.01"
                  value={(r.amountCents / 100).toFixed(2)}
                  onChange={e => {
                    const v = Number(e.target.value);
                    db.upsertDeductionRule({ ...r, amountCents: Number.isFinite(v) ? Math.round(v * 100) : r.amountCents });
                  }}
                />
                <div className="text-xs text-zinc-500">{t("admin.payroll.amountHint")}</div>
              </div>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
