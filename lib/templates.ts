import type { DocKind } from "@/lib/model";
import type { JsonNode } from "@/lib/content";

const p = (): JsonNode => ({ type: "paragraph" });
const h = (text: string, level = 2): JsonNode => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});
const sections = (...titles: string[]) => titles.flatMap((title) => [h(title), p()]);

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
