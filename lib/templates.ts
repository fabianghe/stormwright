import type { DocKind } from "@/lib/model";
import { inlineText, type JsonNode } from "@/lib/content";

const p = (): JsonNode => ({ type: "paragraph" });
const FIELD_LABELS: Partial<Record<DocKind, string[]>> = {
  character: ["Role", "Look", "Voice & how they talk", "Wants", "Fears & secrets"],
  place: ["Mood", "What's here", "Who's here", "Secrets"],
  item: ["What it is", "Where it's found", "What it does"],
};
const field = (label: string): JsonNode => ({ type: "field", attrs: { label }, content: [p()] });
const sections = (...titles: string[]) => titles.map(field);

export function upgradeSectionFields(kind: DocKind, content: unknown): { content: unknown; changed: boolean } {
  const labels = FIELD_LABELS[kind];
  const doc = content as JsonNode | null;
  if (!labels || !doc || doc.type !== "doc") return { content, changed: false };

  const children = doc.content ?? [];
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
        content: [p(), { type: "stage" }, p()],
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
