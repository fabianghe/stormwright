import type { DocStatus } from "@/lib/model";

const COLORS: Record<DocStatus, string> = {
  idea: "var(--ink-faint)",
  draft: "var(--c-items)",
  ready: "var(--c-conditions)",
  built: "var(--c-world)",
};

export function StatusDot({ status, className }: { status: DocStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2 shrink-0 rounded-full ${className ?? ""}`}
      style={{ background: COLORS[status] }}
    />
  );
}
