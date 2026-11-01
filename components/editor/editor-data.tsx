"use client";

import { createContext, useContext } from "react";
import type { DocKind, DocSummary } from "@/lib/model";

export type EditorData = {
  docs: DocSummary[];
  docsById: Map<string, DocSummary>;
  vocab: (kind: string) => string[];
  docsOfKinds: (kinds: DocKind[]) => DocSummary[];
};

const EditorDataContext = createContext<EditorData | null>(null);

export const EditorDataProvider = EditorDataContext.Provider;

export function useEditorData() {
  const data = useContext(EditorDataContext);
  if (!data) throw new Error("useEditorData must be used inside the editor");
  return data;
}
