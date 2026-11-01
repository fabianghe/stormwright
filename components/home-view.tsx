"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { DOC_KINDS, KIND_INFO, STATUS_INFO, displayTitle } from "@/lib/model";
import { timeAgo } from "@/lib/time";
import { KIND_ICONS } from "@/components/icons";
import { StatusDot } from "@/components/status-dot";
import { useDocuments } from "@/components/documents-store";

const TIPS = [
  ["/", "opens the block menu: dialogue, choices, stages, and 24 kinds of actions."],
  ["@", "mentions a character, place, item or quest, or creates one on the spot."],
  ["Enter", "inside a dialogue line starts the next line and alternates speakers."],
  ["Tab", "in a dialogue line jumps to the speaker's name."],
  ["⌘K", "searches every word you've written."],
  ["⌘⇧F", "is focus mode. Esc brings everything back."],
];

const noSubscription = () => () => {};

function greeting(hour: number) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeView({ username }: { username: string }) {
  const store = useDocuments();
  const hello = useSyncExternalStore(
    noSubscription,
    () => greeting(new Date().getHours()),
    () => "Hello",
  );

  const recent = [...store.docs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const totals = store.docs.reduce(
    (sum, d) => ({ words: sum.words + d.stats.words, lines: sum.lines + d.stats.lines, actions: sum.actions + d.stats.actions }),
    { words: 0, lines: 0, actions: 0 },
  );
  const quests = store.docs.filter((d) => d.kind === "quest");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-16 sm:px-10">
        <h1 className="sw-fade-in font-display text-4xl sm:text-5xl">
          <span className="sw-caret">
            {hello}, {username}.
          </span>
        </h1>
        <p className="sw-fade-in mt-3 text-ink-soft [animation-delay:120ms]">What happens next in your story?</p>

        <section className="sw-fade-in mt-10 grid grid-cols-2 gap-3 [animation-delay:200ms] sm:grid-cols-3">
          {DOC_KINDS.map((kind) => {
            const Icon = KIND_ICONS[kind];
            return (
              <button
                key={kind}
                type="button"
                onClick={() => void store.create(kind)}
                className="group rounded-2xl border border-line bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
              >
                <span className="mb-3 grid size-9 place-items-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-105">
                  <Icon size={18} />
                </span>
                <span className="block font-display text-lg">New {KIND_INFO[kind].label.toLowerCase()}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-faint">{KIND_INFO[kind].blurb}</span>
              </button>
            );
          })}
        </section>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <section className="sw-fade-in [animation-delay:280ms]">
            <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-faint">Continue writing</h2>
            {recent.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-faint">
                Your desk is empty. Start with a quest or a character above.
              </p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {recent.map((doc) => {
                  const Icon = KIND_ICONS[doc.kind];
                  return (
                    <li key={doc.id}>
                      <Link href={`/d/${doc.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover">
                        <Icon size={16} className="shrink-0 text-ink-faint" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{displayTitle(doc.title, doc.kind)}</span>
                          <span className="flex items-center gap-1.5 text-xs text-ink-faint">
                            <StatusDot status={doc.status} /> {STATUS_INFO[doc.status].label} · {timeAgo(doc.updatedAt)}
                          </span>
                        </span>
                        <span className="hidden text-xs text-ink-faint sm:inline">{doc.stats.words} words</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="sw-fade-in space-y-6 [animation-delay:340ms]">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-faint">Your world so far</h2>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-ink-soft">Quests</dt>
                <dd className="text-right font-display text-lg">{quests.length}</dd>
                <dt className="text-ink-soft">Words</dt>
                <dd className="text-right font-display text-lg">{totals.words.toLocaleString()}</dd>
                <dt className="text-ink-soft">Dialogue lines</dt>
                <dd className="text-right font-display text-lg">{totals.lines.toLocaleString()}</dd>
                <dt className="text-ink-soft">Actions planned</dt>
                <dd className="text-right font-display text-lg">{totals.actions.toLocaleString()}</dd>
              </dl>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-faint">Little tricks</h2>
              <ul className="space-y-2.5 text-sm leading-relaxed text-ink-soft">
                {TIPS.map(([key, text]) => (
                  <li key={key}>
                    <kbd className="mr-1.5 rounded border border-line bg-bg px-1.5 py-0.5 text-xs text-ink">{key}</kbd>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
