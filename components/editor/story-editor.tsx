"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { CharacterCount, Focus, Placeholder } from "@tiptap/extensions";
import { Bold, Highlighter, Italic, Strikethrough, Underline } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { api } from "@/lib/client-api";
import { displayTitle, type DocKind, type DocSummary, type VocabEntry } from "@/lib/model";
import { extractMeta } from "@/lib/content";
import { prepareContent } from "@/lib/templates";
import { playKey, playReturn } from "@/lib/typewriter-sound";
import { useDocuments } from "@/components/documents-store";
import { usePreferences } from "@/components/preferences";
import { EditorDataProvider, type EditorData } from "./editor-data";
import { Action } from "./extensions/action";
import { Field, Note, Scene, Stage } from "./extensions/blocks";
import { Choice } from "./extensions/choice";
import { Dialogue } from "./extensions/dialogue";
import { QuestStatePage, QuestStates } from "./extensions/quest-state";
import { createMention, setMentionSource } from "./extensions/mention";
import { SlashCommand } from "./extensions/slash";

type Props = {
  content: unknown;
  kind: DocKind;
  scrollRef: RefObject<HTMLElement | null>;
  onChange: () => void;
  onReady: (editor: Editor) => void;
};

function syncReferences(editor: Editor, docsById: Map<string, DocSummary>) {
  const { tr } = editor.state;
  let changed = false;
  editor.state.doc.descendants((node, pos) => {
    const attrs = node.attrs;
    const update = (key: string, id: unknown) => {
      const doc = typeof id === "string" ? docsById.get(id) : undefined;
      if (!doc) return;
      const title = displayTitle(doc.title, doc.kind);
      if (attrs[key] !== title) {
        tr.setNodeMarkup(pos, undefined, { ...attrs, [key]: title });
        changed = true;
      }
    };
    if (node.type.name === "mention") update("label", attrs.id);
    else if (node.type.name === "dialogue") update("speaker", attrs.speakerId);
    else if (node.type.name === "action") update("target", attrs.targetId);
  });
  if (changed) editor.view.dispatch(tr.setMeta("addToHistory", false));
}

function placeholderFor(name: string, level?: number) {
  switch (name) {
    case "heading":
      return level === 1 ? "Chapter title" : "Heading";
    case "scene":
      return "INT. LIGHTHOUSE — NIGHT";
    default:
      return "Write, or press / for blocks and @ to mention…";
  }
}

export function StoryEditor({ content, kind, scrollRef, onChange, onReady }: Props) {
  const router = useRouter();
  const store = useDocuments();
  const prefs = usePreferences();
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const prepared = useMemo(() => prepareContent(kind, content), [kind, content]);

  const live = useRef({ store, router, prefs, onChange, onReady });
  useEffect(() => {
    live.current = { store, router, prefs, onChange, onReady };
  });

  useEffect(() => {
    api<{ vocab: VocabEntry[] }>("/api/vocab")
      .then((r) => setVocab(r.vocab))
      .catch(() => {});
  }, []);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        document: false,
        trailingNode: { notAfter: ["paragraph", "questStates"] },
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true },
        dropcursor: { color: "var(--accent)", width: 2 },
      }),
      Document.extend({ content: "(block | questStates)+" }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        includeChildren: true,
        showOnlyCurrent: false,
        placeholder: ({ editor: e, node, pos, hasAnchor }) => {
          if (node.type.name === "paragraph") {
            const parent = e.state.doc.resolve(pos).parent;
            if (parent.childCount === 1 && parent.type.name === "questStatePage") {
              return "Dialogue and actions for this state. Press / for blocks…";
            }
            if (parent.childCount === 1 && parent.type.name === "field") {
              return String(parent.attrs.label).toLowerCase() === "active short description"
                ? "What the player sees while the quest is active…"
                : "Write here…";
            }
          }
          return hasAnchor ? placeholderFor(node.type.name, node.attrs.level) : "";
        },
      }),
      CharacterCount,
      Focus.configure({ mode: "shallowest" }),
      Stage,
      Field,
      Scene,
      Note,
      Dialogue,
      QuestStates,
      QuestStatePage,
      Choice,
      Action,
      SlashCommand,
      createMention(),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: prepared.content as object,
    immediatelyRender: false,
    editorProps: {
      attributes: { spellcheck: "true", class: "sw-prose" },
      handleKeyDown: (_view, event) => {
        if (!live.current.prefs.sounds || event.metaKey || event.ctrlKey || event.repeat) return false;
        if (event.key === "Enter") playReturn();
        else if (event.key === "Backspace") playKey(true);
        else if (event.key.length === 1) playKey();
        return false;
      },
      handleDOMEvents: {
        click: (_view, event) => {
          const target = (event.target as HTMLElement).closest<HTMLElement>('[data-type="mention"]');
          const id = target?.dataset.id;
          if (!id) return false;
          event.preventDefault();
          live.current.router.push(`/d/${id}`);
          return true;
        },
      },
    },
    onCreate: ({ editor }) => {
      const firstField = editor.state.doc.firstChild;
      const firstParagraph = firstField?.firstChild;
      if (
        firstField?.type.name === "field" &&
        firstParagraph?.type.name === "paragraph" &&
        firstParagraph.content.size === 0
      ) {
        editor.commands.setTextSelection(2);
      }
      syncReferences(editor, live.current.store.docsById);
      live.current.onReady(editor);
      if (prepared.changed) live.current.onChange();
    },
    onUpdate: () => live.current.onChange(),
  });

  useEffect(() => {
    if (editor) setMentionSource(editor, store);
  }, [editor, store]);

  useEffect(() => {
    if (!editor || !prefs.focusMode) return;
    const keepCaretCentered = ({ transaction }: { transaction: { docChanged: boolean; selectionSet: boolean } }) => {
      if (!transaction.docChanged && !transaction.selectionSet) return;
      const scroller = scrollRef.current;
      if (!scroller || !editor.isFocused) return;
      const caret = editor.view.coordsAtPos(editor.state.selection.head);
      const box = scroller.getBoundingClientRect();
      const offset = caret.top - box.top - box.height * 0.42;
      if (Math.abs(offset) > 6) scroller.scrollBy({ top: offset, behavior: "smooth" });
    };
    editor.on("transaction", keepCaretCentered);
    return () => {
      editor.off("transaction", keepCaretCentered);
    };
  }, [editor, prefs.focusMode, scrollRef]);

  const data = useMemo<EditorData>(() => {
    const byKind = (kinds: DocKind[]) => store.docs.filter((d) => kinds.includes(d.kind));
    return {
      docs: store.docs,
      docsById: store.docsById,
      docsOfKinds: byKind,
      vocab: (kind: string) => {
        const local = editor ? extractMeta("", editor.getJSON()).vocab : [];
        const seen = new Set<string>();
        const out: string[] = [];
        for (const entry of [...local, ...vocab]) {
          const key = entry.text.toLowerCase();
          if (entry.kind !== kind || seen.has(key)) continue;
          seen.add(key);
          out.push(entry.text);
        }
        return out;
      },
    };
  }, [store.docs, store.docsById, vocab, editor]);

  return (
    <EditorDataProvider value={data}>
      {editor && (
        <BubbleMenu
          editor={editor}
          className="sw-menu flex items-center gap-0.5 !p-1"
          shouldShow={({ editor: e, from, to }) => from !== to && !e.isActive("action") && e.isEditable}
        >
          {[
            { icon: Bold, mark: "bold", label: "Bold" },
            { icon: Italic, mark: "italic", label: "Italic" },
            { icon: Underline, mark: "underline", label: "Underline" },
            { icon: Strikethrough, mark: "strike", label: "Strike" },
            { icon: Highlighter, mark: "highlight", label: "Highlight" },
          ].map(({ icon: Icon, mark, label }) => (
            <button
              key={mark}
              type="button"
              title={label}
              className={`grid size-8 place-items-center rounded-md hover:bg-hover ${
                editor.isActive(mark) ? "text-accent" : "text-ink-soft"
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                editor.chain().focus().toggleMark(mark).run();
              }}
            >
              <Icon size={16} />
            </button>
          ))}
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className="sw-editor" />
    </EditorDataProvider>
  );
}
