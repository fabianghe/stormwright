import type { Editor } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

let pendingFieldFocus: number | null = null;

export function requestFieldFocus(pos: number) {
  pendingFieldFocus = pos;
}

export function takeFieldFocus(pos: number | undefined) {
  if (pos === undefined || pendingFieldFocus !== pos) return false;
  pendingFieldFocus = null;
  return true;
}

export function focusEditorAt(editor: Editor, pos: number) {
  const { view } = editor;
  view.focus();
  const $pos = view.state.doc.resolve(Math.max(0, Math.min(pos, view.state.doc.content.size)));
  view.dispatch(view.state.tr.setSelection(TextSelection.near($pos)).scrollIntoView());
}

export function exitContainerOnEmptyLast(editor: Editor, typeName: string) {
  const { state } = editor;
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type.name !== "paragraph" || $from.parent.content.size > 0) return false;

  let depth = -1;
  for (let d = $from.depth - 1; d > 0; d--) {
    if ($from.node(d).type.name === typeName) {
      depth = d;
      break;
    }
  }
  if (depth < 0 || $from.depth !== depth + 1) return false;

  const container = $from.node(depth);
  if ($from.index(depth) !== container.childCount - 1) return false;

  const tr = state.tr;
  const after = $from.after(depth);
  if (container.childCount > 1) {
    tr.delete($from.before(), $from.after());
  }
  const insertAt = tr.mapping.map(after);
  tr.insert(insertAt, state.schema.nodes.paragraph.create());
  tr.setSelection(TextSelection.create(tr.doc, insertAt + 1));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export function insertBlockAt(
  editor: Editor,
  range: { from: number; to: number },
  node: JSONContent,
  focusField = false,
) {
  editor.chain().focus().deleteRange(range).run();

  const { $from } = editor.state.selection;
  const parent = $from.parent;
  const replaceCurrent = parent.type.name === "paragraph" && parent.content.size === 0 && $from.depth > 0;
  const at = replaceCurrent ? $from.before() : $from.after();
  const target = replaceCurrent ? { from: $from.before(), to: $from.after() } : at;
  if (focusField) requestFieldFocus(at);
  editor.chain().insertContentAt(target, node, { updateSelection: true }).run();
  return at;
}

export function ensureParagraphAfter(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const after = pos + node.nodeSize;
  const next = editor.state.doc.nodeAt(after);
  if (!next || next.type.name !== "paragraph" || next.content.size > 0) {
    editor.view.dispatch(editor.state.tr.insert(after, editor.schema.nodes.paragraph.create()));
  }
  focusEditorAt(editor, after + 1);
}
