"use client";

import { Check, RotateCcw, Trash } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { FEEDBACK_INFO, type FeedbackEntry } from "@/lib/model";
import { timeAgo } from "@/lib/time";
import { FEEDBACK_ICONS } from "@/components/feedback-kind-icon";

export function FeedbackInbox({ initial }: { initial: FeedbackEntry[] }) {
  const [entries, setEntries] = useState(initial);
  const open = entries.filter((entry) => !entry.done).length;

  const setDone = async (id: string, done: boolean) => {
    setEntries((list) => list.map((entry) => (entry.id === id ? { ...entry, done } : entry)));
    await api(`/api/feedback/${id}`, { method: "PATCH", body: { done } }).catch(() =>
      setEntries((list) => list.map((entry) => (entry.id === id ? { ...entry, done: !done } : entry))),
    );
  };

  const remove = async (entry: FeedbackEntry) => {
    if (!window.confirm("Delete this message forever?")) return;
    await api(`/api/feedback/${entry.id}`, { method: "DELETE" });
    setEntries((list) => list.filter((e) => e.id !== entry.id));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-16 sm:px-10">
        <h1 className="font-display text-4xl">Feedback</h1>
        <p className="mt-2 text-ink-soft">
          {entries.length === 0
            ? "Ideas and problems people send will show up here. Only you can see this page."
            : `${open} open · ${entries.length - open} done. Only you can see this page.`}
        </p>
        {entries.length > 0 && (
          <ul className="mt-8 space-y-3">
            {entries.map((entry) => {
              const Icon = FEEDBACK_ICONS[entry.kind];
              return (
                <li
                  key={entry.id}
                  className={`rounded-2xl border border-line bg-surface px-5 py-4 transition-opacity ${entry.done ? "opacity-55" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
                    <span className="sw-chip !cursor-default">
                      <Icon size={12} /> {FEEDBACK_INFO[entry.kind].label}
                    </span>
                    <span className="text-ink-soft">{entry.username}</span>
                    <span>· {timeAgo(entry.createdAt)}</span>
                    {entry.path && <span className="truncate">· {entry.path}</span>}
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        className="sw-btn sw-btn-ghost !px-2 !py-1 !text-xs"
                        onClick={() => void setDone(entry.id, !entry.done)}
                      >
                        {entry.done ? <RotateCcw size={13} /> : <Check size={13} />} {entry.done ? "Reopen" : "Done"}
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        className="sw-btn sw-btn-ghost !px-2 !py-1"
                        onClick={() => void remove(entry)}
                      >
                        <Trash size={13} />
                      </button>
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap leading-relaxed">
                    {entry.message}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
