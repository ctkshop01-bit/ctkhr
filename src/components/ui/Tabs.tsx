import { cn } from "@/lib/utils";

export type TabOption = { key: string; label: string };

export default function Tabs({
  options,
  value,
  onChange,
  className,
}: {
  options: TabOption[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-1", className)}>
      {options.map(opt => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              "h-9 rounded-xl px-4 text-sm font-medium transition",
              active ? "bg-zinc-100 text-zinc-950" : "text-zinc-300 hover:bg-zinc-900/50",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

