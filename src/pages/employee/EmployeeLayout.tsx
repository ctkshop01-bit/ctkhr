import { NavLink, Outlet } from "react-router-dom";
import { Bell, CalendarDays, ClipboardList, Clock3, FileText, Gauge, Megaphone, Receipt, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import Button from "@/components/ui/Button";
import LanguageToggle from "@/components/common/LanguageToggle";
import { useT } from "@/i18n/useT";

export default function EmployeeLayout() {
  const { userId, name, logout } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const unreadCount = db.notifications.filter(n => n.userId === userId && !n.isRead).length;
  const nav = [
    { to: "/app", key: "nav.dashboard", icon: ClipboardList, end: true },
    { to: "/app/clock", key: "nav.clock", icon: Clock3 },
    { to: "/app/requests", key: "nav.requests", icon: FileText },
    { to: "/app/notifications", key: "employee.nav.notifications", icon: Bell, badge: unreadCount > 0 ? String(unreadCount) : undefined },
    { to: "/app/performance", key: "nav.performance", icon: Gauge },
    { to: "/app/attendance", key: "nav.attendance", icon: CalendarDays },
    { to: "/app/payroll", key: "nav.payroll", icon: Receipt },
    { to: "/app/announcements", key: "nav.announcements", icon: Megaphone },
    { to: "/app/tasks", key: "nav.tasks", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 overflow-hidden rounded-3xl border border-zinc-900/60 bg-zinc-950/30 backdrop-blur lg:flex lg:flex-col">
          <div className="border-b border-zinc-900/60 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">{t("app.employee")}</div>
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
                  {item.badge ? (
                    <span className="ml-auto rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                      {item.badge}
                    </span>
                  ) : null}
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

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900/60 bg-zinc-950/70 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-7xl overflow-x-auto px-3 py-2">
          <div className="grid min-w-max grid-flow-col auto-cols-[minmax(4.5rem,1fr)] gap-1">
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
                <div className="relative">
                  <Icon className="h-4 w-4" />
                  {item.badge ? (
                    <span className="absolute -right-2 -top-2 rounded-full bg-emerald-400 px-1.5 text-[10px] font-semibold text-zinc-950">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
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
