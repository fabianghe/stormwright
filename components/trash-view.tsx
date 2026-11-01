"use client";

import { RotateCcw, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { displayTitle, type DocSummary } from "@/lib/model";
import { timeAgo } from "@/lib/time";
import { KIND_ICONS } from "@/components/icons";
import { useDocuments } from "@/components/documents-store";

export function TrashView() {
  const store = useDocuments();
  const [docs, setDocs] = useState<DocSummary[] | null>(null);

  useEffect(() => {
    api<{ documents: DocSummary[] }>("/api/documents?trash=1")
      .then((r) => setDocs(r.documents))
      .catch(() => setDocs([]));
  }, []);

  const restore = async (id: string) => {
    const { document } = await api<{ document: DocSummary }>(`/api/documents/${id}/restore`, { method: "POST" });
    store.upsert(document);
    setDocs((list) => list?.filter((d) => d.id !== id) ?? null);
  };

  const destroy = async (doc: DocSummary) => {
    if (!window.confirm(`Delete “${displayTitle(doc.title, doc.kind)}” forever? This can't be undone.`)) return;
    await api(`/api/documents/${doc.id}?forever=1`, { method: "DELETE" });
    setDocs((list) => list?.filter((d) => d.id !== doc.id) ?? null);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-16 sm:px-10">
        <h1 className="font-display text-4xl">Trash</h1>
        <p className="mt-2 text-ink-soft">Nothing here is gone until you say so.</p>
        <div className="mt-8">
          {docs === null && <p className="text-ink-faint">Loading…</p>}
          {docs?.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-faint">The trash is empty.</p>
          )}
          {docs && docs.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {docs.map((doc) => {
                const Icon = KIND_ICONS[doc.kind];
                return (
                  <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    <Icon size={16} className="shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{displayTitle(doc.title, doc.kind)}</span>
                      <span className="text-xs text-ink-faint">Edited {timeAgo(doc.updatedAt)}</span>
                    </span>
                    <button type="button" className="sw-btn sw-btn-ghost !py-1.5" onClick={() => void restore(doc.id)}>
                      <RotateCcw size={14} /> Restore
                    </button>
                    <button
                      type="button"
                      className="sw-btn sw-btn-ghost !py-1.5 hover:!text-[var(--c-effects)]"
                      onClick={() => void destroy(doc)}
                    >
                      <Trash size={14} /> Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
