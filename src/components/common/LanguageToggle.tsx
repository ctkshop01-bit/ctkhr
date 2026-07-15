import { Languages } from "lucide-react";
import Button from "@/components/ui/Button";
import { useI18nStore } from "@/stores/i18nStore";

export default function LanguageToggle({ variant = "secondary" }: { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const { lang, toggleLang } = useI18nStore();
  return (
    <Button variant={variant} size="sm" onClick={toggleLang}>
      <Languages className="h-4 w-4" />
      {lang === "th" ? "ไทย" : "中文"}
    </Button>
  );
}

