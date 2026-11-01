import { actionInfo, type DocLink, type DocStats, type VocabEntry } from "@/lib/model";

export type JsonMark = { type: string; attrs?: Record<string, unknown> };
export type JsonNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
  marks?: JsonMark[];
};

const MAX_SEARCH_TEXT = 100_000;

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function inlineText(node: JsonNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "mention") return `@${str(node.attrs?.label)}`;
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}

function asDoc(content: unknown): JsonNode | null {
  if (!content || typeof content !== "object") return null;
  const node = content as JsonNode;
  return node.type === "doc" ? node : null;
}

export type ExtractedMeta = {
  links: DocLink[];
  vocab: VocabEntry[];
  stats: DocStats;
  searchText: string;
};

export function extractMeta(title: string, content: unknown): ExtractedMeta {
  const links = new Map<string, DocLink>();
  const vocab = new Map<string, VocabEntry>();
  const stats: DocStats = { words: 0, stages: 0, lines: 0, actions: 0 };
  const parts: string[] = [title];

  const addLink = (to: unknown, type: DocLink["type"]) => {
    if (typeof to === "string" && to) links.set(`${type}:${to}`, { to, type });
  };
  const addVocab = (kind: string, text: string) => {
    const clean = text.trim();
    if (clean && clean.length <= 80) vocab.set(`${kind}:${clean.toLowerCase()}`, { kind, text: clean });
  };
  const countWords = (text: string) => {
    const matches = text.match(/[\p{L}\p{N}'’-]+/gu);
    stats.words += matches ? matches.length : 0;
  };

  const walk = (node: JsonNode) => {
    const attrs = node.attrs ?? {};
    switch (node.type) {
      case "text":
        countWords(node.text ?? "");
        parts.push(node.text ?? "");
        return;
      case "mention":
        addLink(attrs.id, "mentions");
        parts.push(str(attrs.label));
        return;
      case "stage":
        stats.stages++;
        break;
      case "dialogue":
        stats.lines++;
        addLink(attrs.speakerId, "mentions");
        addVocab("speaker", str(attrs.speaker));
        parts.push(str(attrs.speaker), str(attrs.direction));
        break;
      case "choice":
        countWords(str(attrs.label));
        parts.push(str(attrs.label));
        break;
      case "action": {
        stats.actions++;
        const info = actionInfo(str(attrs.kind));
        if (attrs.targetId && info.link) addLink(attrs.targetId, info.link);
        else addVocab(info.target, str(attrs.target));
        if (info.value && str(attrs.kind) === "stage") addVocab(info.value, str(attrs.value));
        parts.push(info.label, str(attrs.target), str(attrs.value));
        return;
      }
    }
    for (const child of node.content ?? []) walk(child);
    if (node.type === "paragraph" || node.type === "heading") parts.push("\n");
  };

  const doc = asDoc(content);
  if (doc) walk(doc);

  return {
    links: [...links.values()],
    vocab: [...vocab.values()],
    stats,
    searchText: parts.join(" ").replace(/\s+/g, " ").slice(0, MAX_SEARCH_TEXT),
  };
}

function markdownInline(node: JsonNode | undefined): string {
  if (!node) return "";
  if (node.type === "mention") return `@${str(node.attrs?.label)}`;
  if (node.type === "hardBreak") return "  \n";
  if (node.type !== "text") return (node.content ?? []).map(markdownInline).join("");
  let text = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") text = `**${text}**`;
    else if (mark.type === "italic") text = `_${text}_`;
    else if (mark.type === "strike") text = `~~${text}~~`;
    else if (mark.type === "code") text = `\`${text}\``;
    else if (mark.type === "highlight") text = `==${text}==`;
    else if (mark.type === "underline") text = `<u>${text}</u>`;
    else if (mark.type === "link") text = `[${text}](${str(mark.attrs?.href)})`;
  }
  return text;
}

function indent(text: string, prefix: string) {
  return text
    .split("\n")
    .map((line) => (line ? prefix + line : line))
    .join("\n");
}

export function toMarkdown(title: string, content: unknown): string {
  const stageCounter = { n: 0 };

  const blocks = (nodes: JsonNode[] | undefined): string =>
    (nodes ?? [])
      .map(block)
      .filter((b) => b !== null)
      .join("\n\n");

  const block = (node: JsonNode): string | null => {
    const attrs = node.attrs ?? {};
    switch (node.type) {
      case "paragraph":
        return markdownInline(node);
      case "heading":
        return `${"#".repeat(Number(attrs.level) || 2)} ${markdownInline(node)}`;
      case "stage":
        stageCounter.n++;
        return `## Stage ${stageCounter.n}${inlineText(node).trim() ? `: ${markdownInline(node)}` : ""}`;
      case "scene":
        return `**${inlineText(node).toUpperCase()}**`;
      case "dialogue": {
        const speaker = str(attrs.speaker).trim().toUpperCase() || "SOMEONE";
        const direction = str(attrs.direction).trim();
        return `**${speaker}**${direction ? ` _(${direction})_` : ""}: ${markdownInline(node)}`;
      }
      case "choice": {
        const inner = blocks(node.content);
        return `- ▸ **Choice:** ${str(attrs.label) || "…"}${inner ? `\n\n${indent(inner, "  ")}` : ""}`;
      }
      case "action": {
        const info = actionInfo(str(attrs.kind));
        const value = str(attrs.value).trim();
        return `- ⚙ **${info.label}** ${str(attrs.target)}${value ? ` → ${value}` : ""}`;
      }
      case "note":
        return indent(`📝 ${blocks(node.content)}`, "> ");
      case "blockquote":
        return indent(blocks(node.content), "> ");
      case "horizontalRule":
        return "---";
      case "codeBlock":
        return `\`\`\`\n${inlineText(node)}\n\`\`\``;
      case "bulletList":
      case "orderedList":
      case "taskList":
        return (node.content ?? [])
          .map((item, i) => {
            const marker =
              node.type === "orderedList"
                ? `${i + 1}.`
                : node.type === "taskList"
                  ? `- [${item.attrs?.checked ? "x" : " "}]`
                  : "-";
            const inner = blocks(item.content);
            const [first, ...rest] = inner.split("\n");
            return `${marker} ${first}${rest.length ? `\n${indent(rest.join("\n"), "   ")}` : ""}`;
          })
          .join("\n");
      default:
        return node.content ? blocks(node.content) : null;
    }
  };

  const doc = asDoc(content);
  const body = doc ? blocks(doc.content) : "";
  return `# ${title || "Untitled"}\n\n${body}\n`;
}

export type ExportBlock =
  | { type: "text"; text: string }
  | { type: "heading"; level: number; text: string }
  | { type: "scene"; text: string }
  | { type: "line"; speaker: string; direction: string; text: string }
  | { type: "choice"; label: string; blocks: ExportBlock[] }
  | { type: "action"; kind: string; label: string; target: string; value: string }
  | { type: "note"; text: string }
  | { type: "list"; items: string[] };

export type ExportedDoc = {
  title: string;
  kind: string;
  status: string;
  exportedAt: string;
  intro: ExportBlock[];
  stages: { title: string; blocks: ExportBlock[] }[];
};

export function toStructured(
  meta: { title: string; kind: string; status: string },
  content: unknown,
): ExportedDoc {
  const convert = (nodes: JsonNode[] | undefined): ExportBlock[] => {
    const out: ExportBlock[] = [];
    for (const node of nodes ?? []) {
      const attrs = node.attrs ?? {};
      switch (node.type) {
        case "paragraph": {
          const text = inlineText(node).trim();
          if (text) out.push({ type: "text", text });
          break;
        }
        case "heading":
          out.push({ type: "heading", level: Number(attrs.level) || 2, text: inlineText(node) });
          break;
        case "scene":
          out.push({ type: "scene", text: inlineText(node) });
          break;
        case "dialogue":
          out.push({
            type: "line",
            speaker: str(attrs.speaker),
            direction: str(attrs.direction),
            text: inlineText(node),
          });
          break;
        case "choice":
          out.push({ type: "choice", label: str(attrs.label), blocks: convert(node.content) });
          break;
        case "action":
          out.push({
            type: "action",
            kind: str(attrs.kind),
            label: actionInfo(str(attrs.kind)).label,
            target: str(attrs.target),
            value: str(attrs.value),
          });
          break;
        case "note":
          out.push({ type: "note", text: (node.content ?? []).map(inlineText).join("\n") });
          break;
        case "bulletList":
        case "orderedList":
        case "taskList":
          out.push({
            type: "list",
            items: (node.content ?? []).map((item) => (item.content ?? []).map(inlineText).join("\n")),
          });
          break;
        default:
          if (node.content) out.push(...convert(node.content));
      }
    }
    return out;
  };

  const result: ExportedDoc = { ...meta, exportedAt: new Date().toISOString(), intro: [], stages: [] };
  let current: ExportBlock[] = result.intro;
  for (const node of asDoc(content)?.content ?? []) {
    if (node.type === "stage") {
      const stage = { title: inlineText(node), blocks: [] as ExportBlock[] };
      result.stages.push(stage);
      current = stage.blocks;
    } else {
      current.push(...convert([node]));
    }
  }
  return result;
}
