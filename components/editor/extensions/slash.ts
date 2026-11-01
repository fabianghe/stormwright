import { Extension, type Editor, type JSONContent, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import {
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Clapperboard,
  MessageSquareQuote,
  Milestone,
  Minus,
  NotebookPen,
  Pilcrow,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { ACTION_GROUPS, ACTION_KINDS, type ActionKind } from "@/lib/model";
import { actionIcon } from "@/components/icons";
import { popupRenderer, type SuggestionItem } from "../suggestion-list";
import { insertBlockAt } from "./helpers";

type Command = SuggestionItem & {
  keywords: string;
  run: (editor: Editor, range: Range) => void;
};

function block(node: JSONContent, focusField = false) {
  return (editor: Editor, range: Range) => {
    insertBlockAt(editor, range, node, focusField);
  };
}

function cmd(
  id: string,
  title: string,
  hint: string,
  icon: LucideIcon,
  group: string,
  keywords: string,
  run: Command["run"],
): Command {
  return { id, title, hint, icon, group, keywords: `${title} ${keywords}`.toLowerCase(), run };
}

const WRITING = "Writing";
const STORY = "Story blocks";

const COMMANDS: Command[] = [
  cmd("dialogue", "Dialogue", "Someone says a line", MessageSquareQuote, STORY, "line talk say speech npc", block({ type: "dialogue" }, true)),
  cmd("choice", "Player choice", "Branch the conversation", GitBranch, STORY, "option branch answer reply", block({ type: "choice", content: [{ type: "paragraph" }] }, true)),
  cmd("stage", "Quest stage", "A step of the quest", Milestone, STORY, "step objective part", block({ type: "stage" })),
  cmd("scene", "Scene heading", "INT. CAVE — NIGHT", Clapperboard, STORY, "location time cutscene slug", block({ type: "scene" })),
  cmd("note", "Note to self", "A reminder for later", NotebookPen, STORY, "todo reminder designer callout", block({ type: "note", content: [{ type: "paragraph" }] })),
  cmd("text", "Text", "Plain writing", Pilcrow, WRITING, "paragraph plain", (e, r) => e.chain().focus().deleteRange(r).setParagraph().run()),
  cmd("h1", "Big heading", "Chapter title", Heading1, WRITING, "title h1", (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 1 }).run()),
  cmd("h2", "Heading", "Section", Heading2, WRITING, "h2 section", (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run()),
  cmd("h3", "Small heading", "Sub-section", Heading3, WRITING, "h3", (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run()),
  cmd("bullets", "List", "Bullet points", List, WRITING, "bullet ul", (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run()),
  cmd("numbers", "Numbered list", "1, 2, 3", ListOrdered, WRITING, "ordered ol", (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run()),
  cmd("todo", "To-do list", "Things to build", ListChecks, WRITING, "task check checkbox", (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run()),
  cmd("quote", "Quote", "Epigraph or lore excerpt", Quote, WRITING, "blockquote", (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run()),
  cmd("divider", "Divider", "* * *", Minus, WRITING, "hr rule separator break", (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run()),
  ...(Object.keys(ACTION_KINDS) as ActionKind[]).map((kind) => {
    const info = ACTION_KINDS[kind];
    return cmd(
      `action-${kind}`,
      info.label,
      `Action · ${info.target}`,
      actionIcon(kind),
      `Actions · ${ACTION_GROUPS[info.group]}`,
      `action ${kind.replace("_", " ")} ${info.group} ${info.target}`,
      block({ type: "action", attrs: { kind } }, true),
    );
  }),
];

export function filterCommands(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return COMMANDS;
  const words = q.split(/\s+/);
  const rank = (c: Command) => {
    const title = c.title.toLowerCase();
    return title.startsWith(q) ? 0 : title.split(/[\s/]+/).some((w) => w.startsWith(words[0])) ? 1 : 2;
  };
  return COMMANDS.filter((c) => words.every((w) => c.keywords.includes(w)))
    .map((c, i) => ({ c, i, r: rank(c) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(({ c }) => ({ ...c, group: q ? "Best matches" : c.group }));
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SuggestionItem, SuggestionItem>({
        editor: this.editor,
        pluginKey: new PluginKey("slashCommand"),
        char: "/",
        allowSpaces: true,
        startOfLine: false,
        items: ({ query }) => (query.length > 24 ? [] : filterCommands(query)),
        command: ({ editor, range, props }) => {
          const command = COMMANDS.find((c) => c.id === props.id);
          command?.run(editor, range);
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const name = $from.parent.type.name;
          return name === "paragraph" || name === "heading";
        },
        render: popupRenderer("No block by that name"),
      }),
    ];
  },
});
