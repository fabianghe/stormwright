"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { exitContainerOnEmptyLast, focusEditorAt, requestFieldFocus, takeFieldFocus } from "./helpers";

function ChoiceView({ node, updateAttributes, editor, getPos }: ReactNodeViewProps) {
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (takeFieldFocus(getPos())) labelRef.current?.focus();
  }, [getPos]);

  const focusBody = () => {
    const pos = getPos();
    if (pos !== undefined) focusEditorAt(editor, pos + 2);
  };

  const addOption = () => {
    const pos = getPos();
    if (pos === undefined) return;
    const after = pos + node.nodeSize;
    requestFieldFocus(after);
    editor.chain().insertContentAt(after, { type: "choice", content: [{ type: "paragraph" }] }).run();
  };

  return (
    <NodeViewWrapper className="sw-choice" data-type="choice">
      <div className="sw-choice-head" contentEditable={false}>
        <span className="sw-choice-tag">▸ Choice</span>
        <input
          ref={labelRef}
          className="sw-inline-input"
          value={String(node.attrs.label ?? "")}
          placeholder="What the player can say or do…"
          onChange={(event) => updateAttributes({ label: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.preventDefault();
              focusBody();
            }
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded-md px-1.5 text-xs text-ink-faint hover:bg-hover hover:text-accent"
          onClick={addOption}
          title="Add another option"
        >
          + option
        </button>
      </div>
      <NodeViewContent className="sw-choice-body" />
    </NodeViewWrapper>
  );
}

export const Choice = Node.create({
  name: "choice",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label") ?? "",
        renderHTML: (attrs) => ({ "data-label": attrs.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="choice"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "choice" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChoiceView);
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => exitContainerOnEmptyLast(editor, this.name),
    };
  },
});
