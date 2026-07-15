import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dialog({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  className,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mx-auto flex h-full max-w-[680px] items-end p-4 sm:items-center">
        <div
          className={cn(
            "w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)]",
            className,
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between gap-3 border-b border-zinc-900 px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{title}</div>
              {description ? <div className="mt-1 text-xs text-zinc-400">{description}</div> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-auto px-5 py-4">{children}</div>
          {footer ? <div className="border-t border-zinc-900 px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
