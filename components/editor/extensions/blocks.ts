import { Node, mergeAttributes } from "@tiptap/core";
import { exitContainerOnEmptyLast } from "./helpers";

export const Field = Node.create({
  name: "field",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return { label: { default: "", rendered: false } };
  },

  parseHTML() {
    return [
      {
        tag: 'section[data-type="field"]',
        contentElement: ".sw-field-content",
        getAttrs: (element) => ({
          label: (element as HTMLElement).querySelector(".sw-field-label")?.textContent ?? "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "field", class: "sw-field" }),
      ["div", { class: "sw-field-label", contenteditable: "false" }, node.attrs.label],
      ["div", { class: "sw-field-content" }, 0],
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => exitContainerOnEmptyLast(editor, this.name),
    };
  },
});

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
