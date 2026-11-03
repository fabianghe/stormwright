export const DOC_KINDS = ["quest", "story", "character", "place", "item", "note", "task"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const KIND_INFO: Record<DocKind, { label: string; plural: string; blurb: string }> = {
  quest: { label: "Quest", plural: "Quests", blurb: "Stages, dialogue and what happens in the world" },
  story: { label: "Story", plural: "Story", blurb: "Chapters, scenes and cutscene scripts" },
  character: { label: "Character", plural: "Characters", blurb: "Who they are, how they talk" },
  place: { label: "Place", plural: "Places", blurb: "Locations, moods and secrets" },
  item: { label: "Item", plural: "Items", blurb: "Things to find, carry and give" },
  note: { label: "Note", plural: "Notes", blurb: "Lore, ideas and loose thoughts" },
  task: { label: "Task", plural: "Tasks", blurb: "Menus, systems and polish to build" },
};

export const DOC_STATUSES = ["idea", "draft", "ready", "built"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const STATUS_INFO: Record<DocStatus, { label: string }> = {
  idea: { label: "To do" },
  draft: { label: "In progress" },
  ready: { label: "Ready to implement" },
  built: { label: "Done" },
};

export const CHARACTER_COLORS = ["rose", "ember", "gold", "moss", "teal", "sky", "iris", "plum"] as const;
export type CharacterColor = (typeof CHARACTER_COLORS)[number];

export const COLOR_INFO: Record<CharacterColor, { label: string }> = {
  rose: { label: "Rose" },
  ember: { label: "Ember" },
  gold: { label: "Gold" },
  moss: { label: "Moss" },
  teal: { label: "Teal" },
  sky: { label: "Sky" },
  iris: { label: "Iris" },
  plum: { label: "Plum" },
};

export const FEEDBACK_KINDS = ["idea", "problem", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_INFO: Record<FeedbackKind, { label: string; placeholder: string }> = {
  idea: { label: "Idea", placeholder: "What would make Gameweft better for you?" },
  problem: { label: "Problem", placeholder: "What happened, and what did you expect instead?" },
  other: { label: "Other", placeholder: "Anything on your mind…" },
};

export type FeedbackEntry = {
  id: string;
  username: string;
  kind: FeedbackKind;
  message: string;
  path: string;
  done: boolean;
  createdAt: string;
};

export function isFeedbackKind(value: unknown): value is FeedbackKind {
  return typeof value === "string" && (FEEDBACK_KINDS as readonly string[]).includes(value);
}

export const QUEST_STATES = [
  {
    state: "not_started",
    tab: "Offer",
    label: "Offer · Not started",
    runtimeStatus: "NotStarted",
    hint: "Plays while the quest isn't started. Finishing it starts the quest.",
  },
  {
    state: "in_progress",
    tab: "In progress",
    label: "In progress",
    runtimeStatus: "InProgress",
    hint: "The quest's stages, and what plays while they aren't done yet.",
  },
  {
    state: "achieved",
    tab: "Ready",
    label: "Ready · Achieved",
    runtimeStatus: "Achieved",
    hint: "Plays when every objective is done. Finishing it turns the quest in.",
  },
  {
    state: "completed",
    tab: "Completed",
    label: "Completed",
    runtimeStatus: "Completed",
    hint: "Plays after the quest is turned in.",
  },
  { state: "failed", tab: "Failed", label: "Failed", runtimeStatus: "Failed", hint: "Plays after the quest has failed." },
] as const;
export type QuestState = (typeof QUEST_STATES)[number]["state"];

export function isQuestState(value: unknown): value is QuestState {
  return QUEST_STATES.some((info) => info.state === value);
}

export function questStateInfo(value: unknown) {
  return QUEST_STATES.find((info) => info.state === value) ?? QUEST_STATES[0];
}

export type ActionGroup = "world" | "story" | "items" | "effects" | "conditions" | "other";

export const ACTION_GROUPS: Record<ActionGroup, string> = {
  world: "World",
  story: "Story",
  items: "Items",
  effects: "Effects",
  conditions: "Only if…",
  other: "Other",
};

export type LinkType = "starts" | "advances" | "completes" | "fails" | "requires" | "mentions";

export type ActionKindInfo = {
  label: string;
  group: ActionGroup;
  target: string;
  value?: string;
  refKinds?: DocKind[];
  link?: LinkType;
};

export const ACTION_KINDS = {
  enable: { label: "Turn ON", group: "world", target: "GameObject" },
  disable: { label: "Turn OFF", group: "world", target: "GameObject" },
  spawn: { label: "Spawn", group: "world", target: "What", value: "Where" },
  move: { label: "Move / teleport", group: "world", target: "Who or what", value: "To where" },
  destroy: { label: "Break / destroy", group: "world", target: "What" },
  animate: { label: "Play animation", group: "world", target: "Who", value: "Animation" },
  flag: { label: "Set story flag", group: "story", target: "Flag", value: "Value" },
  quest_start: { label: "Start quest", group: "story", target: "Quest", refKinds: ["quest"], link: "starts" },
  stage: { label: "Go to stage", group: "story", target: "Stage", value: "Of quest" },
  quest_complete: { label: "Complete quest", group: "story", target: "Quest", refKinds: ["quest"], link: "completes" },
  quest_fail: { label: "Fail quest", group: "story", target: "Quest", refKinds: ["quest"], link: "fails" },
  report: { label: "Report event", group: "story", target: "Verb (Opened, Reached…)", value: "What (tag)" },
  give: { label: "Give item", group: "items", target: "Item", value: "Amount", refKinds: ["item"], link: "mentions" },
  take: { label: "Take item", group: "items", target: "Item", value: "Amount", refKinds: ["item"], link: "mentions" },
  event: { label: "Event / VFX", group: "effects", target: "What happens", value: "Where" },
  sound: { label: "Play sound", group: "effects", target: "Sound", value: "Where" },
  music: { label: "Change music", group: "effects", target: "Track or mood" },
  camera: { label: "Camera / cutscene", group: "effects", target: "Shot or cutscene" },
  fade: { label: "Fade screen", group: "effects", target: "To black, in, white…", value: "Seconds" },
  wait: { label: "Wait", group: "effects", target: "Seconds" },
  if_flag: { label: "Only if flag", group: "conditions", target: "Flag", value: "Is" },
  if_item: { label: "Only if has item", group: "conditions", target: "Item", value: "Amount", refKinds: ["item"], link: "mentions" },
  if_quest: { label: "Only if quest", group: "conditions", target: "Quest", value: "Is (done, active…)", refKinds: ["quest"], link: "requires" },
  custom: { label: "Game action", group: "other", target: "Describe what happens in the game" },
} satisfies Record<string, ActionKindInfo>;

export type ActionKind = keyof typeof ACTION_KINDS;

export function actionInfo(kind: string): ActionKindInfo {
  return (ACTION_KINDS as Record<string, ActionKindInfo>)[kind] ?? ACTION_KINDS.custom;
}

export type DocLink = { to: string; type: LinkType };
export type VocabEntry = { kind: string; text: string };
export type DocStats = { words: number; stages: number; lines: number; actions: number };

export type ProjectSummary = { id: string; name: string; position: number; createdAt: string };

export type DocSummary = {
  id: string;
  title: string;
  kind: DocKind;
  status: DocStatus;
  color: CharacterColor | null;
  pinned: boolean;
  position: number;
  updatedAt: string;
  links: DocLink[];
  stats: DocStats;
  mapX: number | null;
  mapY: number | null;
  mapLinks: string[];
};

export type FullDoc = DocSummary & {
  content: unknown;
  createdAt: string;
  deletedAt: string | null;
};

export function isDocKind(value: unknown): value is DocKind {
  return typeof value === "string" && (DOC_KINDS as readonly string[]).includes(value);
}

export const MAP_HIDDEN_COOKIE = "sw_map_hidden";

export function parseHiddenKinds(value: string | undefined): DocKind[] {
  return (value ?? "").split(",").filter(isDocKind);
}

export function isDocStatus(value: unknown): value is DocStatus {
  return typeof value === "string" && (DOC_STATUSES as readonly string[]).includes(value);
}

export function isCharacterColor(value: unknown): value is CharacterColor {
  return typeof value === "string" && (CHARACTER_COLORS as readonly string[]).includes(value);
}

export function docColor(doc: Pick<DocSummary, "kind" | "color"> | undefined) {
  return doc?.kind === "character" ? doc.color : null;
}

export function displayTitle(title: string, kind?: DocKind) {
  return title.trim() || (kind ? `Untitled ${KIND_INFO[kind].label.toLowerCase()}` : "Untitled");
}
