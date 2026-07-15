import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useT } from "@/i18n/useT";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";

type FormState = {
  currentPassword: string;
  newUsername: string;
  newPassword: string;
  confirmPassword: string;
};

const initialForm: FormState = {
  currentPassword: "",
  newUsername: "",
  newPassword: "",
  confirmPassword: "",
};

export default function AdminAccount() {
  const t = useT();
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const updateAdminCredentials = useDbStore(state => state.updateAdminCredentials);
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setErrorKey("admin.account.err.mismatch");
      return;
    }

    setSaving(true);
    setErrorKey(null);

    try {
      const result = await updateAdminCredentials({
        currentPassword: form.currentPassword,
        newUsername: form.newUsername.trim(),
        newPassword: form.newPassword,
      });

      if (result.ok === false) {
        const errorMap: Record<string, string> = {
          bad_current_password: "admin.account.err.badCurrentPwd",
          username_taken: "admin.account.err.usernameTaken",
          invalid_input: "admin.account.err.invalidInput",
          admin_not_found: "admin.account.err.adminNotFound",
        };
        setErrorKey(errorMap[result.code] ?? "auth.error");
        return;
      }

      logout();
      navigate("/login", { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("admin.account.title")}</div>
        <div className="mt-1 text-sm text-zinc-400">{t("admin.account.subtitle")}</div>
      </div>

      <Card className="mt-6 max-w-2xl">
        <CardHeader className="block space-y-1">
          <CardTitle>{t("nav.adminAccount")}</CardTitle>
          <CardDescription>{t("admin.account.formDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.account.currentPwd")}</div>
              <Input
                type="password"
                value={form.currentPassword}
                onChange={event => setForm(state => ({ ...state, currentPassword: event.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.account.newUsername")}</div>
              <Input value={form.newUsername} onChange={event => setForm(state => ({ ...state, newUsername: event.target.value }))} />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.account.newPwd")}</div>
              <Input
                type="password"
                value={form.newPassword}
                onChange={event => setForm(state => ({ ...state, newPassword: event.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.account.confirmPwd")}</div>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={event => setForm(state => ({ ...state, confirmPassword: event.target.value }))}
              />
            </div>

            {errorKey ? <div className="text-sm text-rose-300">{t(errorKey)}</div> : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  saving ||
                  !form.currentPassword.trim() ||
                  !form.newUsername.trim() ||
                  !form.newPassword ||
                  !form.confirmPassword
                }
              >
                {t("admin.account.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
