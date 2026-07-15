import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@/types/domain";
import { useDbStore } from "@/stores/dbStore";
import { translate } from "@/i18n/translations";
import { useI18nStore } from "@/stores/i18nStore";
import { isBuiltInDemoUsername } from "@/data/seedUserIds";
import { sharedApiLogin } from "@/lib/sharedApi";

type AuthState = {
  token: string | null;
  userId: string | null;
  role: UserRole | null;
  name: string | null;
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      role: null,
      name: null,

      login: async (username, password) => {
        const result = await sharedApiLogin(username, password);
        if (!result.ok || !result.user) {
          return { ok: false, message: translate(useI18nStore.getState().lang, "auth.error") };
        }
        const user = result.user;
        if (isBuiltInDemoUsername(username)) {
          useDbStore.getState().clearBuiltInDemoData();
        }
        const token = `t_${user.id}_${Date.now()}`;
        set({ token, userId: user.id, role: user.role, name: user.name });
        return { ok: true };
      },

      logout: () => set({ token: null, userId: null, role: null, name: null }),
    }),
    {
      name: "am_auth_v1",
      partialize: s => ({ token: s.token, userId: s.userId, role: s.role, name: s.name }),
    },
  ),
);

export function getAuthUser(): User | undefined {
  const { userId } = useAuthStore.getState();
  if (!userId) return undefined;
  return useDbStore.getState().getUserById(userId);
}
