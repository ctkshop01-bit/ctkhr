import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Moon, Sun } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { useTheme } from "@/hooks/useTheme";
import LanguageToggle from "@/components/common/LanguageToggle";
import { useT } from "@/i18n/useT";
import { importLocalDbToServer, shared } from "@/lib/sharedApi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { token, role } = useAuthStore();
  const t = useT();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<{ initialized: boolean } | null>(null);

  const from = useMemo(() => {
    const s = (location.state as { from?: string } | null)?.from;
    return typeof s === "string" ? s : null;
  }, [location.state]);

  useEffect(() => {
    shared.bootstrap().then(setBootstrap).catch(() => setBootstrap({ initialized: true }));
  }, []);

  async function handleImportCurrentBrowserData() {
    const raw = localStorage.getItem("am_db_v1");
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    await importLocalDbToServer(parsed.state ?? parsed);
    await useDbStore.getState().loadSharedSnapshot();
    setBootstrap({ initialized: true });
  }

  if (token) return <Navigate to={from ?? (role === "admin" ? "/admin" : "/app")} replace />;

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={`absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl ${isDark ? "bg-blue-500/18" : "bg-blue-500/12"}`}
        />
        <div className={`absolute -bottom-48 right-[-180px] h-[520px] w-[520px] rounded-full blur-3xl ${isDark ? "bg-emerald-500/16" : "bg-emerald-500/10"}`} />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-center lg:py-16">
        <div className="lg:w-[46%]">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t("app.title")}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
            {t("auth.hero.title")}
            <span className="block text-zinc-400">{t("auth.hero.sub")}</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
            {t("auth.hero.desc")}
          </p>
        </div>

        <div className="lg:w-[54%]">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-100">{t("auth.login")}</div>
            <div className="flex items-center gap-2">
              <LanguageToggle variant="secondary" />
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 text-xs text-zinc-300 hover:bg-zinc-900/40"
              >
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {t("auth.theme")}
              </button>
            </div>
          </div>

          <Card className="mt-3">
            <CardContent className="pt-5">
              <form
                className="grid gap-4"
                onSubmit={async e => {
                  e.preventDefault();
                  setError(null);
                  setLoading(true);
                  try {
                    const res = await useAuthStore.getState().login(username.trim(), password);
                    if (res.ok === false) {
                      setError(res.message);
                      return;
                    }
                    const nextRole = useAuthStore.getState().role;
                    navigate(from ?? (nextRole === "admin" ? "/admin" : "/app"), { replace: true });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("auth.username")}</div>
                  <Input value={username} onChange={e => setUsername(e.target.value)} placeholder={t("auth.usernamePH")} autoComplete="username" />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-zinc-300">{t("auth.password")}</div>
                  <Input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPH")}
                    type="password"
                    autoComplete="current-password"
                  />
                </div>
                {error ? <div className="text-sm text-rose-300">{error}</div> : null}
                {bootstrap?.initialized === false ? (
                  <Button type="button" variant="secondary" onClick={handleImportCurrentBrowserData}>
                    导入这台电脑当前数据为共享主数据
                  </Button>
                ) : null}
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="min-w-28">
                    <span>{t("auth.enter")}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
