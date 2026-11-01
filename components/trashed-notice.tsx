"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import type { DocSummary } from "@/lib/model";
import { useDocuments } from "@/components/documents-store";

export function TrashedNotice({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const store = useDocuments();
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <p className="font-display text-3xl">“{title}” is in the trash.</p>
        <button
          type="button"
          className="sw-btn sw-btn-primary mt-6"
          onClick={async () => {
            const { document } = await api<{ document: DocSummary }>(`/api/documents/${id}/restore`, { method: "POST" });
            store.upsert(document);
            router.refresh();
          }}
        >
          <RotateCcw size={15} /> Restore it
        </button>
      </div>
    </div>
  );
}
