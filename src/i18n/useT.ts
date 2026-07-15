import { useCallback } from "react";
import { translate, type Lang } from "@/i18n/translations";
import { useI18nStore } from "@/stores/i18nStore";

export function useT() {
  const lang = useI18nStore(s => s.lang);
  return useCallback((key: string, params?: Record<string, string | number>) => translate(lang, key, params), [lang]);
}

export function getLang(): Lang {
  return useI18nStore.getState().lang;
}

