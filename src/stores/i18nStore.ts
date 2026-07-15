import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/i18n/translations";

type I18nState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
};

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: "th",
      setLang: lang => set({ lang }),
      toggleLang: () => set({ lang: get().lang === "th" ? "zh" : "th" }),
    }),
    { name: "am_i18n_v1", partialize: s => ({ lang: s.lang }) },
  ),
);

