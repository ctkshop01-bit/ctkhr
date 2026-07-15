import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export default function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:translate-y-[1px] disabled:opacity-60 disabled:pointer-events-none";

  const variants: Record<Variant, string> = {
    primary:
      "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_12px_30px_-16px_rgba(16,185,129,0.65)]",
    secondary:
      "bg-zinc-900/70 text-zinc-100 hover:bg-zinc-900 border border-zinc-800 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)]",
    ghost: "bg-transparent text-zinc-100 hover:bg-zinc-900/40",
    danger:
      "bg-rose-500 text-zinc-950 hover:bg-rose-400 shadow-[0_12px_30px_-16px_rgba(244,63,94,0.55)]",
  };

  const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-base",
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}

