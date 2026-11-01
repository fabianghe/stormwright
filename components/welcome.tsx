import {
  AtSign,
  Check,
  GitBranch,
  ListChecks,
  Network,
  PanelsTopLeft,
  Scroll,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import { DOC_STATUSES, QUEST_STATES, STATUS_INFO, type DocKind, type DocStatus } from "@/lib/model";
import { KIND_ICONS } from "@/components/icons";
import { StatusDot } from "@/components/status-dot";
import { LogoMark } from "@/components/logo";

function Line({ speaker, direction, children }: { speaker: string; direction?: string; children: ReactNode }) {
  return (
    <div className="sw-dialogue">
      <span className="sw-dialogue-mark">“</span>
      <div className="sw-dialogue-head">
        <span className="sw-speaker">{speaker}</span>
        {direction && <span className="text-sm italic text-ink-faint">({direction})</span>}
      </div>
      <p className="sw-dialogue-line">{children}</p>
    </div>
  );
}

function Action({ children }: { children: ReactNode }) {
  return (
    <div className="sw-action flex-wrap gap-y-1">
      <span className="sw-action-kind">
        <WandSparkles size={15} /> Game action
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function Mention({ children }: { children: ReactNode }) {
  return <span className="sw-mention">@{children}</span>;
}

function Feature({
  icon: Icon,
  title,
  caption,
  className = "",
  children,
}: {
  icon: LucideIcon;
  title: string;
  caption: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 ${className}`}>
      <h3 className="flex items-center gap-2 font-display text-lg">
        <Icon size={17} className="shrink-0 text-accent" /> {title}
      </h3>
      <div className="mt-4 flex-1 space-y-3 rounded-xl bg-raised px-4 py-3.5 text-[0.92rem] leading-relaxed ring-1 ring-line">
        {children}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{caption}</p>
    </section>
  );
}

export function WelcomeIntro({ className = "" }: { className?: string }) {
  return (
    <header className={`sw-fade-in ${className}`}>
      <div className="flex items-center gap-3">
        <LogoMark size={44} />
        <span className="font-display text-4xl tracking-wide">
          <span className="sw-caret">{APP_NAME}</span>
        </span>
      </div>
      <h1 className="mt-8 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
        Write your game&apos;s story.
      </h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
        {APP_NAME} is a writing app for game devs and writers. Plan quests, write dialogue and describe what
        happens in the world, side by side in calm documents that your game can actually use.
      </p>
      <p className="mt-4 text-sm text-ink-faint">{TAGLINE}</p>
    </header>
  );
}

export function WelcomeFeatures({ className = "" }: { className?: string }) {
  return (
    <div className={`sw-fade-in [animation-delay:150ms] ${className}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Feature
          icon={PanelsTopLeft}
          title="Write dialogue like a script"
          className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
          caption="Offer, In progress, Ready, Completed and Failed each get their own tab, so you write exactly what plays when. Dialogue reads like a script: speakers autocomplete from your characters, and Enter starts the next line."
        >
          <div className="sw-quest-tablist">
            {QUEST_STATES.map(({ state, tab }) => (
              <span key={state} className="sw-quest-tab cursor-default" data-active={state === "not_started"}>
                {tab}
              </span>
            ))}
          </div>
          <Line speaker="Wren" direction="out of breath">
            Is the ferry still running tonight?
          </Line>
          <Line speaker="Tomas" direction="gruffly">
            Not without the toll, little courier.
          </Line>
          <Line speaker="Wren" direction="grinning">
            Then I&apos;ll owe you one.
          </Line>
          <Line speaker="Tomas">Hmph. Get in before the fog does.</Line>
        </Feature>
        <Feature
          icon={GitBranch}
          title="Player choices that branch"
          caption="Each option holds its own branch of dialogue and actions, nested as deep as you need."
        >
          <div className="sw-choice">
            <div className="sw-choice-head">
              <span className="sw-choice-tag">▸ Choice</span>
              <span>Pay the toll</span>
            </div>
          </div>
          <div className="sw-choice">
            <div className="sw-choice-head">
              <span className="sw-choice-tag">▸ Choice</span>
              <span>Hide among the cargo</span>
            </div>
            <p className="mt-1 text-ink-soft">Tomas hears a sneeze from the crates…</p>
          </div>
        </Feature>
        <Feature
          icon={AtSign}
          title="Everything links up"
          caption="Type @ to link characters, places, items and quests. Renames stay in sync, and every page shows what mentions it."
        >
          <p>
            Ask <Mention>Tomas</Mention> about the fog over the <Mention>Old harbour</Mention>.
          </p>
          <p className="text-xs text-ink-faint">
            Mentioned in · <span className="text-ink-soft">The Ferryman&apos;s Debt</span> ·{" "}
            <span className="text-ink-soft">Fog Night</span>
          </p>
        </Feature>
        <Feature
          icon={ListChecks}
          title="Track progress like a task board"
          className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
          caption="Every page moves from To do to In progress, Ready to implement and Done. Statuses show in the sidebar, and quests marked Done turn green on the quest map, so you always know what's left to build."
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start lg:flex-col lg:items-stretch xl:flex-row xl:items-start">
            <ul className="min-w-0 flex-1 space-y-1">
              {BOARD.map(({ title, status }) => (
                <li key={title} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm">
                  <Scroll size={14} className="shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-faint">
                    <StatusDot status={status} /> {STATUS_INFO[status].label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="sw-menu w-full shrink-0 sm:w-52 lg:w-full xl:w-52">
              <div className="sw-menu-label">Status</div>
              {DOC_STATUSES.map((status) => (
                <div key={status} className="sw-menu-item cursor-default" data-active={status === "draft"}>
                  <StatusDot status={status} /> {STATUS_INFO[status].label}
                  {status === "draft" && <Check size={14} className="ml-auto text-accent" />}
                </div>
              ))}
            </div>
          </div>
        </Feature>
        <WelcomeMap />
        <WelcomeActions />
      </div>
    </div>
  );
}

const MAP_CARDS: { kind: DocKind; status: DocStatus; title: string; meta: string; x: number; y: number }[] = [
  { kind: "quest", status: "built", title: "The Ferryman's Debt", meta: "2 stages · 8 lines", x: 2, y: 14 },
  { kind: "quest", status: "draft", title: "Across the Marsh", meta: "1 stage · 3 lines", x: 50, y: 118 },
  { kind: "story", status: "idea", title: "Fog Night", meta: "12 lines", x: 2, y: 222 },
];

export function WelcomeMap({ className = "" }: { className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 ${className}`}>
      <h3 className="flex items-center gap-2 font-display text-lg">
        <Network size={17} className="shrink-0 text-accent" /> See the whole story at once
      </h3>
      <div
        className="relative mt-4 h-[19.5rem] w-full overflow-hidden rounded-xl bg-raised ring-1 ring-line"
        style={{ backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      >
        <svg className="absolute inset-0 size-full text-ink-faint" viewBox="0 0 300 312" preserveAspectRatio="none" fill="none" aria-hidden>
          <path d="M150 52 C 222 52, 222 60, 222 118" stroke="currentColor" strokeWidth="1.3" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
          <path d="M222 194 C 222 260, 214 260, 150 260" stroke="currentColor" strokeWidth="1.3" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        </svg>
        {MAP_CARDS.map(({ kind, status, title, meta, x, y }) => {
          const Icon = KIND_ICONS[kind];
          return (
            <div
              key={title}
              className={`sw-quest-node absolute w-[48%] rounded-xl border border-line bg-surface px-3 py-2 shadow-sm ${
                status === "built" ? "is-done" : ""
              }`}
              style={{ left: `${x}%`, top: y }}
            >
              <div className="flex items-center gap-1.5 text-[0.62rem] text-ink-faint">
                <Icon size={11} />
                <span className="uppercase tracking-[0.14em]">{kind}</span>
                <span className="ml-auto flex items-center gap-1" title={STATUS_INFO[status].label}>
                  <StatusDot status={status} className="!size-1.5" />
                </span>
              </div>
              <div className="mt-1 font-display text-[0.95rem] leading-snug text-ink">{title}</div>
              <div className="mt-0.5 text-[0.65rem] text-ink-faint">{meta}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        The quest map lays out quests and story chapters as cards you can arrange, linked wherever they mention each
        other. Mark a quest Done once it&apos;s in your game.
      </p>
    </section>
  );
}

const BOARD: { title: string; status: DocStatus }[] = [
  { title: "The Ferryman's Debt", status: "built" },
  { title: "Across the Marsh", status: "draft" },
  { title: "The Lantern Keeper", status: "ready" },
  { title: "Fog Night", status: "idea" },
];

export function WelcomeActions({ className = "" }: { className?: string }) {
  return (
    <Feature
      icon={WandSparkles}
      title="Say what happens in the world"
      className={className}
      caption="Describe anything your game should do, in your own words: switch objects on, set flags, give items, start the next quest."
    >
      <Action>Raise the drawbridge at the harbour</Action>
      <Action>Give Wren the brass key</Action>
      <Action>Start quest: Across the Marsh</Action>
    </Feature>
  );
}
