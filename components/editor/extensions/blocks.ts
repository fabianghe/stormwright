import { Node, mergeAttributes } from "@tiptap/core";
import { exitContainerOnEmptyLast } from "./helpers";

export const Stage = Node.create({
  name: "stage",
  group: "block",
  content: "inline*",
  marks: "",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="stage"]', contentElement: "h2" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "stage", class: "sw-stage" }),
      ["div", { class: "sw-stage-label", contenteditable: "false" }],
      ["h2", 0],
    ];
  },
});

export const Scene = Node.create({
  name: "scene",
  group: "block",
  content: "inline*",
  marks: "",
  defining: true,

  parseHTML() {
    return [{ tag: 'p[data-type="scene"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes, { "data-type": "scene", class: "sw-scene" }), 0];
  },
});

export const Note = Node.create({
  name: "note",
  group: "block",
  content: "paragraph+",
  defining: true,

  parseHTML() {
    return [{ tag: 'aside[data-type="note"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { "data-type": "note", class: "sw-note" }), 0];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => exitContainerOnEmptyLast(editor, this.name),
    };
  },
});
