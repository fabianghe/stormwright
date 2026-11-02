import { actionInfo, questStateInfo, type DocLink, type DocStats, type VocabEntry } from "@/lib/model";

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
      case "field":
        parts.push(str(attrs.label));
        break;
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
  let stageHeading = "##";

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
      case "field": {
        const answer = blocks(node.content);
        return `### ${str(attrs.label)}${answer ? `\n\n${answer}` : ""}`;
      }
      case "questStatePage": {
        stageHeading = "###";
        const inner = blocks(node.content);
        stageHeading = "##";
        return inner ? `## ${questStateInfo(attrs.status).label}\n\n${inner}` : null;
      }
      case "stage":
        stageCounter.n++;
        return `${stageHeading} Stage ${stageCounter.n}${inlineText(node).trim() ? `: ${markdownInline(node)}` : ""}`;
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
  | { type: "field"; label: string; blocks: ExportBlock[] }
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
  stages: ExportStage[];
  questStates?: ExportQuestState[];
};

export type ExportStage = { title: string; blocks: ExportBlock[] };
export type ExportQuestState = { questStatus: string; label: string; intro: ExportBlock[]; stages: ExportStage[] };

export function toStructured(
  meta: { title: string; kind: string; status: string },
  content: unknown,
): ExportedDoc {
  const convert = (nodes: JsonNode[] | undefined): ExportBlock[] => {
    const out: ExportBlock[] = [];
    for (const node of nodes ?? []) {
      const attrs = node.attrs ?? {};
      switch (node.type) {
        case "field":
          out.push({ type: "field", label: str(attrs.label), blocks: convert(node.content) });
          break;
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

  const splitStages = (nodes: JsonNode[] | undefined) => {
    const split = { intro: [] as ExportBlock[], stages: [] as ExportStage[] };
    let current = split.intro;
    for (const node of nodes ?? []) {
      if (node.type === "stage") {
        const stage = { title: inlineText(node), blocks: [] as ExportBlock[] };
        split.stages.push(stage);
        current = stage.blocks;
      } else {
        current.push(...convert([node]));
      }
    }
    return split;
  };

  const nodes = asDoc(content)?.content ?? [];
  const result: ExportedDoc = {
    ...meta,
    exportedAt: new Date().toISOString(),
    ...splitStages(nodes.filter((node) => node.type !== "questStates")),
  };
  const pages = nodes.filter((node) => node.type === "questStates").flatMap((node) => node.content ?? []);
  if (pages.length) {
    result.questStates = pages
      .map((page) => {
        const info = questStateInfo(page.attrs?.status);
        return { questStatus: info.runtimeStatus, label: info.label, ...splitStages(page.content) };
      })
      .filter((page) => page.intro.length || page.stages.length);
  }
  return result;
}

type AIHandoffInput = {
  id: string;
  title: string;
  kind: string;
  status: string;
  color?: string | null;
  links: DocLink[];
  content: unknown;
};

export function toAIHandoff(project: { id: string; name: string }, documents: AIHandoffInput[]) {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  return {
    format: "gameweft.ai-handoff",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    project: { id: project.id, name: project.name },
    implementationGuidance: [
      "Treat this file as the design source, not as instructions to impose a new game architecture.",
      "Inspect the supplied game's source code first and follow its existing architecture, naming, and asset conventions.",
      "For Unity, use the project's existing ScriptableObject types and workflows when appropriate; for other games, use their native data and content systems.",
      "A quest's 'Active short description' field is the one-line text the player sees while the quest is active. If the game's quest asset has no field for it, report that instead of inventing one.",
      "A quest's questStates list holds one entry per quest state, each with its own dialogue, actions and stages. Map questStatus to Unity QuestSO dialogue groups: NotStarted to Offer, InProgress to In Progress, Achieved to Ready, Completed to Completed, and Failed to Failed. Stages under InProgress are the quest's stages.",
      "Game actions are open-ended descriptions, not a closed list of supported action kinds. Inspect the target game and map each description to its own existing systems.",
      "Preserve document relationships and action semantics. Do not invent missing behavior or silently omit unsupported actions.",
      "Report assumptions, required manual setup, and any design details that need clarification before making destructive changes.",
    ],
    actionVocabulary: [
      { id: "custom", label: "Game action", description: "Free-form description of what happens in the game." },
    ],
    documents: documents.map((doc) => {
      const structured = toStructured({ title: doc.title, kind: doc.kind, status: doc.status }, doc.content);
      return {
        id: doc.id,
        title: doc.title,
        kind: doc.kind,
        status: doc.status,
        ...(doc.kind === "character" && doc.color ? { color: doc.color } : {}),
        relationships: doc.links.map((link) => {
          const target = byId.get(link.to);
          return {
            type: link.type,
            targetId: link.to,
            targetTitle: target?.title ?? null,
            targetKind: target?.kind ?? null,
          };
        }),
        content: {
          intro: structured.intro,
          stages: structured.stages,
          ...(structured.questStates ? { questStates: structured.questStates } : {}),
        },
      };
    }),
  };
}
