"use client";

import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { useCallback, useEffect, useState } from "react";
import { QUEST_STATES, isQuestState, questStateInfo, type QuestState } from "@/lib/model";

const openTabs = new WeakMap<Editor, QuestState>();

function hasWriting(page: PMNode) {
  const first = page.firstChild;
  return page.childCount > 1 || !first || first.type.name !== "paragraph" || first.content.size > 0;
}

function QuestTabsView({ node, editor, getPos }: ReactNodeViewProps) {
  const [open, setOpenState] = useState<QuestState>(() => openTabs.get(editor) ?? "not_started");

  const setOpen = useCallback(
    (state: QuestState) => {
      openTabs.set(editor, state);
      setOpenState(state);
    },
    [editor],
  );

  useEffect(() => {
    const follow = () => {
      const { $head } = editor.state.selection;
      if ($head.depth < 2 || $head.before(1) !== getPos()) return;
      const state = $head.node(2).attrs.status;
      if (!isQuestState(state) || state === openTabs.get(editor)) return;
      setOpen(state);
      requestAnimationFrame(() => {
        if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.scrollIntoView());
      });
    };
    editor.on("selectionUpdate", follow);
    return () => {
      editor.off("selectionUpdate", follow);
    };
  }, [editor, getPos, setOpen]);

  const openTab = (state: QuestState) => {
    setOpen(state);
    const pos = getPos();
    const tabs = pos === undefined ? null : editor.state.doc.nodeAt(pos);
    if (pos === undefined || !tabs) return;
    let end = -1;
    tabs.forEach((page, offset) => {
      if (page.attrs.status === state) end = pos + offset + page.nodeSize;
    });
    if (end < 0) return;
    const { view } = editor;
    view.focus();
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(end), -1)));
  };

  const filled: Partial<Record<QuestState, boolean>> = {};
  node.forEach((page) => {
    const state = page.attrs.status;
    if (isQuestState(state) && hasWriting(page)) filled[state] = true;
  });

  return (
    <NodeViewWrapper className="sw-quest-tabs" data-type="quest-states" data-open={open}>
      <div className="sw-quest-tablist" role="tablist" aria-label="Quest states" contentEditable={false}>
        {QUEST_STATES.map(({ state, tab }) => (
          <button
            key={state}
            type="button"
            role="tab"
            aria-selected={open === state}
            className="sw-quest-tab"
            data-active={open === state}
            data-filled={filled[state] === true}
            onClick={() => openTab(state)}
          >
            {tab}
          </button>
        ))}
      </div>
      <p className="sw-quest-hint" contentEditable={false}>
        {questStateInfo(open).hint}
      </p>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

function keepWritingInTabs(editor: Editor) {
  return new Plugin({
    key: new PluginKey("questTabsOnly"),
    appendTransaction(transactions, _old, state) {
      if (!transactions.some((tr) => tr.docChanged)) return null;
      let tabsPos = -1;
      const strays: { node: PMNode; pos: number }[] = [];
      state.doc.forEach((node, pos) => {
        if (node.type.name === "questStates") tabsPos = pos;
        else if (node.type.name !== "field") strays.push({ node, pos });
      });
      if (tabsPos < 0 || strays.length === 0) return null;

      const { head } = state.selection;
      let headOffset = -1;
      let movedSize = 0;
      for (const { node, pos } of strays) {
        if (head >= pos && head <= pos + node.nodeSize) headOffset = movedSize + head - pos;
        movedSize += node.nodeSize;
      }

      const tr = state.tr;
      for (let i = strays.length - 1; i >= 0; i--) tr.delete(strays[i].pos, strays[i].pos + strays[i].node.nodeSize);
      const tabsStart = tr.mapping.map(tabsPos);
      const tabs = tr.doc.nodeAt(tabsStart);
      if (!tabs) return null;

      const open = openTabs.get(editor) ?? "not_started";
      let from = -1;
      let to = -1;
      tabs.forEach((page, offset) => {
        if (page.attrs.status !== open) return;
        to = tabsStart + offset + page.nodeSize;
        from = hasWriting(page) ? to : to - page.content.size;
      });
      if (from < 0) return null;

      tr.replaceWith(from, to, strays.map((stray) => stray.node));
      if (headOffset >= 0) tr.setSelection(TextSelection.near(tr.doc.resolve(from + headOffset)));
      return tr.scrollIntoView();
    },
  });
}

export const QuestStatePage = Node.create({
  name: "questStatePage",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      status: {
        default: "not_started",
        parseHTML: (element) => (element as HTMLElement).getAttribute("data-status"),
        renderHTML: (attrs) => ({ "data-status": attrs.status }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-type="quest-state-page"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["section", mergeAttributes(HTMLAttributes, { "data-type": "quest-state-page", class: "sw-quest-page" }), 0];
  },
});

export const QuestStates = Node.create({
  name: "questStates",
  group: "questStates",
  content: "questStatePage+",
  defining: true,
  isolating: true,
  selectable: false,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-type="quest-states"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "quest-states", class: "sw-quest-tabs" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestTabsView);
  },

  addProseMirrorPlugins() {
    return [keepWritingInTabs(this.editor)];
  },
});
