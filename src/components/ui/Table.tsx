import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-900/60 bg-zinc-950/20">
      <table className={cn("w-full border-separate border-spacing-0 text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 border-b border-zinc-900/60 bg-zinc-950/70 px-4 py-3 text-left text-xs font-semibold tracking-wide text-zinc-300 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-zinc-900/50 px-4 py-3 text-zinc-100", className)} {...props} />;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-zinc-900/30", className)} {...props} />;
}

