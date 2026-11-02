import type { Editor } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import { Plus } from "lucide-react";
import { DOC_KINDS, KIND_INFO, displayTitle, docColor, type DocKind, type DocSummary } from "@/lib/model";
import { KIND_ICONS } from "@/components/icons";
import { popupRenderer, type SuggestionItem } from "../suggestion-list";

export type MentionSource = {
  docs: DocSummary[];
  create: (kind: DocKind, title: string, open?: boolean) => Promise<DocSummary | null>;
};

const sources = new WeakMap<Editor, MentionSource>();

export function setMentionSource(editor: Editor, source: MentionSource) {
  sources.set(editor, source);
}

const NEW_PREFIX = "__new:";
const QUICK_CREATE: DocKind[] = ["character", "place", "item", "quest"];

export function createMention() {
  return Mention.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        kind: {
          default: null,
          parseHTML: (el: HTMLElement) => el.getAttribute("data-kind"),
          renderHTML: (attrs: Record<string, unknown>) => (attrs.kind ? { "data-kind": attrs.kind } : {}),
        },
      };
    },
  }).configure({
    HTMLAttributes: { class: "sw-mention" },
    suggestion: {
      char: "@",
      pluginKey: new PluginKey("mention"),
      allowSpaces: true,
      items: ({ query, editor }): SuggestionItem[] => {
        const q = query.trim().toLowerCase();
        const docs = (sources.get(editor)?.docs ?? [])
          .filter((d) => !q || displayTitle(d.title, d.kind).toLowerCase().includes(q))
          .sort((a, b) => DOC_KINDS.indexOf(a.kind) - DOC_KINDS.indexOf(b.kind))
          .slice(0, 8)
          .map((d) => ({
            id: d.id,
            title: displayTitle(d.title, d.kind),
            hint: KIND_INFO[d.kind].label,
            icon: KIND_ICONS[d.kind],
            color: docColor(d),
            group: "Mention",
          }));
        const exact = docs.some((d) => d.title.toLowerCase() === q);
        const creates =
          q && !exact && query.length <= 60
            ? QUICK_CREATE.map((kind) => ({
                id: `${NEW_PREFIX}${kind}`,
                title: `New ${KIND_INFO[kind].label.toLowerCase()} “${query.trim()}”`,
                icon: Plus,
                group: "Create",
              }))
            : [];
        return [...docs, ...creates];
      },
      command: ({ editor, range, props }) => {
        const source = sources.get(editor);
        if (!source) return;
        const insert = (doc: { id: string; title: string; kind: DocKind }) => {
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const to = nodeAfter?.text?.startsWith(" ") ? range.to + 1 : range.to;
          editor
            .chain()
            .focus()
            .insertContentAt({ from: range.from, to }, [
              { type: "mention", attrs: { id: doc.id, label: displayTitle(doc.title, doc.kind), kind: doc.kind } },
              { type: "text", text: " " },
            ])
            .run();
        };

        const item = props as SuggestionItem;
        if (item.id.startsWith(NEW_PREFIX)) {
          const kind = item.id.slice(NEW_PREFIX.length) as DocKind;
          const title = editor.state.doc.textBetween(range.from + 1, range.to).trim();
          void source.create(kind, title, false).then((doc) => doc && insert(doc));
          return;
        }
        const doc = source.docs.find((d) => d.id === item.id);
        if (doc) insert(doc);
      },
      render: popupRenderer("Nothing to mention yet"),
    },
  });
}
