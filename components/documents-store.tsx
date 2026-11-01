"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/client-api";
import type { DocKind, DocSummary } from "@/lib/model";

type Store = {
  docs: DocSummary[];
  docsById: Map<string, DocSummary>;
  upsert: (doc: DocSummary) => void;
  remove: (id: string) => void;
  create: (kind: DocKind, title?: string, open?: boolean) => Promise<DocSummary | null>;
  update: (id: string, patch: Partial<Pick<DocSummary, "title" | "pinned" | "position" | "status" | "kind" | "mapX" | "mapY">>) => Promise<void>;
  trash: (id: string) => Promise<void>;
  reorder: (orderedIds: string[], movedId: string) => void;
};

const StoreContext = createContext<Store | null>(null);

function sortDocs(docs: DocSummary[]) {
  return [...docs].sort((a, b) => a.position - b.position || b.updatedAt.localeCompare(a.updatedAt));
}

export function DocumentsProvider({ initial, children }: { initial: DocSummary[]; children: ReactNode }) {
  const router = useRouter();
  const [docs, setDocs] = useState(() => sortDocs(initial));

  const upsert = useCallback((doc: DocSummary) => {
    setDocs((list) => sortDocs([doc, ...list.filter((d) => d.id !== doc.id)]));
  }, []);

  const remove = useCallback((id: string) => setDocs((list) => list.filter((d) => d.id !== id)), []);

  const create = useCallback(
    async (kind: DocKind, title = "", open = true) => {
      try {
        const { document } = await api<{ document: DocSummary }>("/api/documents", { body: { kind, title } });
        upsert(document);
        if (open) router.push(`/d/${document.id}`);
        return document;
      } catch {
        return null;
      }
    },
    [router, upsert],
  );

  const update = useCallback<Store["update"]>(
    async (id, patch) => {
      setDocs((list) => sortDocs(list.map((d) => (d.id === id ? { ...d, ...patch } : d))));
      const { document } = await api<{ document: DocSummary }>(`/api/documents/${id}`, { method: "PATCH", body: patch });
      upsert(document);
    },
    [upsert],
  );

  const trash = useCallback(
    async (id: string) => {
      await api(`/api/documents/${id}`, { method: "DELETE" });
      remove(id);
    },
    [remove],
  );

  const reorder = useCallback(
    (orderedIds: string[], movedId: string) => {
      const byId = new Map(docs.map((d) => [d.id, d]));
      const index = orderedIds.indexOf(movedId);
      const prev = byId.get(orderedIds[index - 1])?.position;
      const next = byId.get(orderedIds[index + 1])?.position;

      let changes: [string, number][];
      if (prev !== undefined && next !== undefined && next - prev > 1e-6) changes = [[movedId, (prev + next) / 2]];
      else if (prev === undefined && next !== undefined) changes = [[movedId, next - 1]];
      else if (next === undefined && prev !== undefined) changes = [[movedId, prev + 1]];
      else if (prev === undefined && next === undefined) changes = [];
      else {
        const base = Math.min(...orderedIds.map((id) => byId.get(id)?.position ?? 0));
        changes = orderedIds
          .map((id, i): [string, number] => [id, base + i])
          .filter(([id, position]) => byId.get(id)?.position !== position);
      }

      for (const [id, position] of changes) void update(id, { position }).catch(() => {});
    },
    [docs, update],
  );

  const value = useMemo<Store>(
    () => ({ docs, docsById: new Map(docs.map((d) => [d.id, d])), upsert, remove, create, update, trash, reorder }),
    [docs, upsert, remove, create, update, trash, reorder],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDocuments() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useDocuments must be used inside DocumentsProvider");
  return store;
}
