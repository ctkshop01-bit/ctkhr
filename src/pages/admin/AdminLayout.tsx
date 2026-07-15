import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Calculator, ClipboardCheck, Gauge, LayoutDashboard, LogOut, Settings, Settings2, SlidersHorizontal, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import Button from "@/components/ui/Button";
import LanguageToggle from "@/components/common/LanguageToggle";
import { useT } from "@/i18n/useT";

const nav = [
  { to: "/admin/admin-account", key: "nav.adminAccount", icon: Settings },
  { to: "/admin", key: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/employees", key: "nav.employees", icon: Users },
  { to: "/admin/approvals", key: "nav.approvals", icon: ClipboardCheck },
  { to: "/admin/approval-settings", key: "nav.approvalSettings", icon: Settings2 },
  { to: "/admin/performance-dashboard", key: "nav.performanceDashboard", icon: Gauge },
  { to: "/admin/performance-settings", key: "nav.performanceSettings", icon: SlidersHorizontal },
  { to: "/admin/payroll", key: "nav.payrollAdmin", icon: Calculator },
  { to: "/admin/analytics", key: "nav.analytics", icon: BarChart3 },
];

export default function AdminLayout() {
  const { name, logout } = useAuthStore();
  const t = useT();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-72 shrink-0 overflow-hidden rounded-3xl border border-zinc-900/60 bg-zinc-950/30 backdrop-blur lg:flex lg:flex-col">
          <div className="border-b border-zinc-900/60 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">{t("app.admin")}</div>
              <LanguageToggle variant="ghost" />
            </div>
            <div className="mt-1 truncate text-base font-semibold text-zinc-100">{name ?? "—"}</div>
          </div>
          <nav className="flex-1 overflow-auto p-3">
            {nav.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition",
                      isActive ? "bg-zinc-100 text-zinc-950" : "text-zinc-300 hover:bg-zinc-900/40 hover:text-zinc-100",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{t(item.key)}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="border-t border-zinc-900/60 p-4">
            <Button variant="secondary" className="w-full" onClick={logout}>
              <LogOut className="h-4 w-4" />
              {t("action.logout")}
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <div className="text-sm font-semibold text-zinc-100">{t("app.admin")}</div>
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              {t("action.logout")}
            </Button>
          </div>
          <Outlet />
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900/60 bg-zinc-950/70 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-7xl overflow-x-auto px-3 py-2">
          <div className="grid min-w-max grid-flow-col auto-cols-[minmax(4.75rem,1fr)] gap-1">
            {nav.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs transition",
                    isActive ? "bg-zinc-100 text-zinc-950" : "text-zinc-300 hover:bg-zinc-900/40",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span className="leading-none">{t(item.key)}</span>
              </NavLink>
            );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
