"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { toMarkdown } from "@/lib/content";
import { dateTime, timeAgo } from "@/lib/time";

type VersionSummary = { id: string; title: string; createdAt: string };
type Version = VersionSummary & { content: unknown };

export function HistoryPanel({
  docId,
  onClose,
  onRestore,
}: {
  docId: string;
  onClose: () => void;
  onRestore: (version: Version) => Promise<void>;
}) {
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [selected, setSelected] = useState<Version | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    api<{ versions: VersionSummary[] }>(`/api/documents/${docId}/versions`)
      .then((r) => setVersions(r.versions))
      .catch(() => setVersions([]));
  }, [docId]);

  const open = async (id: string) => {
    const { version } = await api<{ version: Version }>(`/api/documents/${docId}/versions/${id}`);
    setSelected(version);
  };

  return (
    <aside className="sw-no-print fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl sw-fade-in">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-lg">History</h2>
          <p className="text-xs text-ink-faint">A snapshot is kept every 10 minutes while you write.</p>
        </div>
        <button type="button" className="sw-btn sw-btn-ghost !p-2" onClick={onClose} aria-label="Close history">
          <X size={18} />
        </button>
      </header>

      {selected ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3 text-sm">
            <button type="button" className="text-ink-soft hover:text-ink" onClick={() => setSelected(null)}>
              ← All versions
            </button>
            <button
              type="button"
              className="sw-btn sw-btn-primary !py-1.5"
              disabled={restoring}
              onClick={async () => {
                setRestoring(true);
                try {
                  await onRestore(selected);
                } finally {
                  setRestoring(false);
                }
              }}
            >
              <RotateCcw size={14} />
              {restoring ? "Restoring…" : "Restore this version"}
            </button>
          </div>
          <p className="px-5 pt-3 text-xs text-ink-faint">{dateTime(selected.createdAt)}</p>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-5 py-3 text-sm leading-relaxed text-ink-soft">
            {toMarkdown(selected.title, selected.content)}
          </pre>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {versions === null && <p className="p-4 text-sm text-ink-faint">Loading…</p>}
          {versions?.length === 0 && <p className="p-4 text-sm text-ink-faint">No snapshots yet. Keep writing.</p>}
          {versions?.map((v) => (
            <button key={v.id} type="button" className="sw-menu-item flex-col !items-start" onClick={() => open(v.id)}>
              <span>{timeAgo(v.createdAt)}</span>
              <span className="text-xs text-ink-faint">
                {dateTime(v.createdAt)} · {v.title || "Untitled"}
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
