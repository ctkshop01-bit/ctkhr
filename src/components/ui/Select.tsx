import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export default function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

