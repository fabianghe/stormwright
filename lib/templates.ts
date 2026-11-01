import { QUEST_STATES, isQuestState, type DocKind, type QuestState } from "@/lib/model";
import { inlineText, type JsonNode } from "@/lib/content";

const p = (): JsonNode => ({ type: "paragraph" });
const FIELD_LABELS: Partial<Record<DocKind, string[]>> = {
  character: ["Role", "Look", "Voice & how they talk", "Wants", "Fears & secrets"],
  place: ["Mood", "What's here", "Who's here", "Secrets"],
  item: ["What it is", "Where it's found", "What it does"],
};
const field = (label: string): JsonNode => ({ type: "field", attrs: { label }, content: [p()] });
const sections = (...titles: string[]) => titles.map(field);
const ACTIVE_DESCRIPTION = "Active short description";

type QuestPages = Partial<Record<QuestState, JsonNode[]>>;

const isEmptyParagraph = (node: JsonNode) => node.type === "paragraph" && !node.content?.length;
const isActiveDescription = (node: JsonNode) =>
  node.type === "field" && String(node.attrs?.label ?? "").trim().toLowerCase() === ACTIVE_DESCRIPTION.toLowerCase();

function pageContent(nodes: JsonNode[] = []): JsonNode[] {
  const content = nodes.filter((node) => !isEmptyParagraph(node));
  const last = content.at(-1);
  if (last?.type !== "paragraph") content.push(p());
  return content;
}

const questTabs = (pages: QuestPages = {}): JsonNode => ({
  type: "questStates",
  content: QUEST_STATES.map(({ state }) => ({
    type: "questStatePage",
    attrs: { status: state },
    content: pageContent(pages[state]),
  })),
});

function hasTidyTabs(node: JsonNode | undefined) {
  const pages = node?.type === "questStates" ? (node.content ?? []) : [];
  return (
    pages.length === QUEST_STATES.length &&
    pages.every((page, index) => page.attrs?.status === QUEST_STATES[index].state && page.content?.length)
  );
}

function upgradeQuest(doc: JsonNode): { content: JsonNode; changed: boolean } {
  const children = doc.content ?? [];
  const header = children.filter((node) => node.type === "field");
  if (header.some(isActiveDescription) && children.length === header.length + 1 && hasTidyTabs(children.at(-1))) {
    return { content: doc, changed: false };
  }

  const pages: QuestPages = {};
  const add = (state: unknown, nodes: JsonNode[]) => (pages[isQuestState(state) ? state : "in_progress"] ??= []).push(...nodes);
  let marker: QuestState | null = null;
  for (const node of children) {
    if (node.type === "field" || node.type === "questStateTabs") continue;
    if (node.type === "questStates") {
      for (const page of node.content ?? []) add(page.attrs?.status, page.content ?? []);
    } else if (node.type === "questState") {
      const state = node.attrs?.status;
      marker = isQuestState(state) ? state : null;
    } else if (node.type === "questDialogue") {
      add(node.attrs?.status, node.content ?? []);
    } else {
      if (node.type === "stage") marker = null;
      add(marker, [node]);
    }
  }

  if (!header.some(isActiveDescription)) header.unshift(field(ACTIVE_DESCRIPTION));
  return { content: { ...doc, content: [...header, questTabs(pages)] }, changed: true };
}

function withoutLegacyNodes(nodes: JsonNode[]): { nodes: JsonNode[]; changed: boolean } {
  const out: JsonNode[] = [];
  let changed = false;
  for (const node of nodes) {
    if (node.type === "questState" || node.type === "questStateTabs") {
      changed = true;
    } else if (node.type === "questDialogue") {
      out.push(...withoutLegacyNodes(node.content ?? []).nodes);
      changed = true;
    } else if (node.content) {
      const inner = withoutLegacyNodes(node.content);
      out.push(inner.changed ? { ...node, content: inner.nodes.length ? inner.nodes : [p()] } : node);
      changed ||= inner.changed;
    } else {
      out.push(node);
    }
  }
  return { nodes: out, changed };
}

export function prepareContent(kind: DocKind, content: unknown): { content: unknown; changed: boolean } {
  const doc = content as JsonNode | null;
  if (!doc || doc.type !== "doc") return { content, changed: false };
  const upgraded = kind === "quest" ? upgradeQuest(doc) : upgradeSectionFields(kind, doc);
  const cleaned = withoutLegacyNodes((upgraded.content as JsonNode).content ?? []);
  if (!cleaned.changed) return upgraded;
  return { content: { ...(upgraded.content as JsonNode), content: cleaned.nodes }, changed: true };
}

function upgradeSectionFields(kind: DocKind, content: unknown): { content: unknown; changed: boolean } {
  const doc = content as JsonNode | null;
  if (!doc || doc.type !== "doc") return { content, changed: false };

  const children = doc.content ?? [];
  const labels = FIELD_LABELS[kind];
  if (!labels) return { content, changed: false };
  if (children.length < labels.length * 2) return { content, changed: false };

  const fields: JsonNode[] = [];
  for (let index = 0; index < labels.length; index++) {
    const heading = children[index * 2];
    const answer = children[index * 2 + 1];
    if (heading.type !== "heading" || ![2, 3].includes(Number(heading.attrs?.level)) || answer.type !== "paragraph") {
      return { content, changed: false };
    }

    const label = labels[index];
    const headingText = inlineText(heading).trim();
    const headingIsLabel = headingText.toLowerCase() === label.toLowerCase();
    const answerHasContent = inlineText(answer).trim().length > 0;
    const blocks: JsonNode[] = [];
    if (!headingIsLabel && heading.content?.length) blocks.push({ type: "paragraph", content: heading.content });
    if (headingIsLabel || answerHasContent) blocks.push(answer);
    if (blocks.length === 0) blocks.push(p());
    fields.push({ type: "field", attrs: { label }, content: blocks });
  }

  return { content: { ...doc, content: [...fields, ...children.slice(labels.length * 2)] }, changed: true };
}

export function templateFor(kind: DocKind): JsonNode {
  switch (kind) {
    case "quest":
      return {
        type: "doc",
        content: [field(ACTIVE_DESCRIPTION), questTabs({ in_progress: [{ type: "stage" }, p()] })],
      };
    case "story":
      return { type: "doc", content: [{ type: "scene" }, p()] };
    case "character":
      return { type: "doc", content: sections("Role", "Look", "Voice & how they talk", "Wants", "Fears & secrets") };
    case "place":
      return { type: "doc", content: sections("Mood", "What's here", "Who's here", "Secrets") };
    case "item":
      return { type: "doc", content: sections("What it is", "Where it's found", "What it does") };
    default:
      return { type: "doc", content: [p()] };
  }
}
