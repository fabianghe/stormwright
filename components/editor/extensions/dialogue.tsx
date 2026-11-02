"use client";

import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { displayTitle, docColor } from "@/lib/model";
import { Combo, type ComboOption } from "../combo";
import { useEditorData } from "../editor-data";
import { focusEditorAt, requestFieldFocus, takeFieldFocus } from "./helpers";

function focusSpeakerInput(editor: Editor, pos: number) {
  const dom = editor.view.nodeDOM(pos);
  if (dom instanceof HTMLElement) dom.querySelector<HTMLInputElement>("input.sw-speaker")?.focus();
}

function splitDialogue(editor: Editor) {
  const { state } = editor;
  const { $from, $to } = state.selection;
  const node = $from.parent;
  if (node.type.name !== "dialogue" || !$from.sameParent($to)) return false;

  if (node.content.size === 0) return editor.chain().setNode("paragraph").run();

  const parent = $from.node($from.depth - 1);
  const index = $from.index($from.depth - 1);
  const prev = index > 0 ? parent.child(index - 1) : null;
  const current = String(node.attrs.speaker ?? "").trim().toLowerCase();
  const alternate =
    prev?.type.name === "dialogue" &&
    String(prev.attrs.speaker ?? "").trim() &&
    String(prev.attrs.speaker).trim().toLowerCase() !== current;
  const next = alternate
    ? { speaker: prev!.attrs.speaker, speakerId: prev!.attrs.speakerId, direction: "" }
    : { speaker: "", speakerId: null, direction: "" };

  const tr = state.tr;
  if (!state.selection.empty) tr.deleteSelection();
  const splitAt = tr.selection.from;
  tr.split(splitAt, 1, [{ type: node.type, attrs: next }]);
  if (!next.speaker) requestFieldFocus(splitAt + 1);
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

function DialogueView({ node, updateAttributes, editor, getPos }: ReactNodeViewProps) {
  const data = useEditorData();
  const speakerRef = useRef<HTMLInputElement>(null);
  const speaker = String(node.attrs.speaker ?? "");
  const direction = String(node.attrs.direction ?? "");
  const speakerId = node.attrs.speakerId;
  const color = typeof speakerId === "string" ? docColor(data.docsById.get(speakerId)) : null;

  useEffect(() => {
    if (takeFieldFocus(getPos())) speakerRef.current?.focus();
  }, [getPos]);

  const focusLine = () => {
    const pos = getPos();
    if (pos !== undefined) focusEditorAt(editor, pos + 1 + node.content.size);
  };

  const speakerOptions = (): ComboOption[] => [
    ...data
      .docsOfKinds(["character"])
      .map((d) => ({ id: d.id, label: displayTitle(d.title, d.kind), hint: "character", color: docColor(d) })),
    ...data.vocab("speaker").map((text) => ({ label: text })),
  ];

  const onSpeaker = (text: string, option: ComboOption | null) => {
    const needle = text.trim().toLowerCase();
    const match =
      option?.id ?? data.docsOfKinds(["character"]).find((d) => d.title.trim().toLowerCase() === needle)?.id ?? null;
    updateAttributes({ speaker: text, speakerId: match });
  };

  return (
    <NodeViewWrapper className="sw-dialogue" data-type="dialogue" data-color={color ?? undefined}>
      <span className="sw-dialogue-mark" contentEditable={false}>
        “
      </span>
      <div className="sw-dialogue-head" contentEditable={false}>
        <Combo
          inputRef={speakerRef}
          className="sw-speaker"
          value={speaker}
          placeholder="Who speaks?"
          options={speakerOptions}
          onChange={onSpeaker}
          onEnter={focusLine}
          onEscape={focusLine}
        />
        <span className="text-ink-faint text-sm">{direction ? "(" : ""}</span>
        <input
          className="sw-direction"
          value={direction}
          placeholder={direction ? "" : "how? (whispers, angry…)"}
          spellCheck={false}
          onChange={(event) => updateAttributes({ direction: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.preventDefault();
              focusLine();
            }
          }}
        />
        <span className="text-ink-faint text-sm -ml-1">{direction ? ")" : ""}</span>
      </div>
      <NodeViewContent className="sw-dialogue-line" />
    </NodeViewWrapper>
  );
}

export const Dialogue = Node.create({
  name: "dialogue",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      speaker: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-speaker") ?? "",
        renderHTML: (attrs) => ({ "data-speaker": attrs.speaker }),
      },
      speakerId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-speaker-id"),
        renderHTML: (attrs) => (attrs.speakerId ? { "data-speaker-id": attrs.speakerId } : {}),
      },
      direction: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-direction") ?? "",
        renderHTML: (attrs) => (attrs.direction ? { "data-direction": attrs.direction } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="dialogue"]', contentElement: "p" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "dialogue" }), ["p", 0]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DialogueView);
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => splitDialogue(editor),
      Tab: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== "dialogue") return false;
        focusSpeakerInput(editor, $from.before());
        return true;
      },
    };
  },
});
