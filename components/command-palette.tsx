"use client";

import { FileText, Moon, Network, Plus, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/client-api";
import { DOC_KINDS, KIND_INFO, displayTitle, docColor, isDocKind } from "@/lib/model";
import { isDark } from "@/lib/theme";
import { KIND_ICONS } from "@/components/icons";
import { useDocuments } from "@/components/documents-store";
import { usePreferences } from "@/components/preferences";

type Entry = { id: string; title: string; hint?: string; icon: ReactNode; group: string; run: () => void };
type Hit = { id: string; title: string; kind: string; snippet: string };

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const store = useDocuments();
  const prefs = usePreferences();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [hits, setHits] = useState<Hit[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const searchable = query.trim().length >= 2;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const handle = setTimeout(() => {
      api<{ results: Hit[] }>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => setHits(r.results))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim().toLowerCase();
    const go = (path: string) => () => {
      onClose();
      router.push(path);
    };
    const titleMatches = store.docs
      .filter((d) => !q || displayTitle(d.title, d.kind).toLowerCase().includes(q))
      .slice(0, q ? 8 : 6);
    const shown = new Set(titleMatches.map((d) => d.id));

    const docEntries: Entry[] = titleMatches.map((d) => {
      const Icon = KIND_ICONS[d.kind];
      return {
        id: d.id,
        title: displayTitle(d.title, d.kind),
        hint: KIND_INFO[d.kind].label,
        icon: <Icon size={15} data-color={docColor(d) ?? undefined} />,
        group: q ? "Documents" : "Recent",
        run: go(`/d/${d.id}`),
      };
    });

    const textEntries: Entry[] = (searchable ? hits : [])
      .filter((h) => !shown.has(h.id))
      .map((h) => {
        const Icon = isDocKind(h.kind) ? KIND_ICONS[h.kind] : FileText;
        return {
          id: `hit:${h.id}`,
          title: displayTitle(h.title, isDocKind(h.kind) ? h.kind : undefined),
          hint: h.snippet,
          icon: <Icon size={15} data-color={docColor(store.docsById.get(h.id)) ?? undefined} />,
          group: "Found in text",
          run: go(`/d/${h.id}`),
        };
      });

    const dark = typeof window !== "undefined" && isDark(prefs.theme.mode);
    const actions: Entry[] = [
      ...DOC_KINDS.map((kind) => ({
        id: `new:${kind}`,
        title: `New ${KIND_INFO[kind].label.toLowerCase()}${q ? ` “${query.trim()}”` : ""}`,
        icon: <Plus size={15} />,
        group: "Create",
        run: () => {
          onClose();
          void store.create(kind, query.trim());
        },
      })),
      { id: "map", title: "Open the todo map", icon: <Network size={15} />, group: "Go", run: go("/map") },
      {
        id: "mode",
        title: dark ? "Switch to light mode" : "Switch to dark mode",
        icon: dark ? <Sun size={15} /> : <Moon size={15} />,
        group: "Go",
        run: () => {
          prefs.setTheme({ ...prefs.theme, mode: dark ? "light" : "dark" });
          onClose();
        },
      },
    ].filter((e) => !q || e.title.toLowerCase().includes(q) || e.group === "Create");

    return [...docEntries, ...textEntries, ...actions];
  }, [query, hits, searchable, store, prefs, router, onClose]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/25 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        className="sw-menu w-full max-w-xl !p-0"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, entries.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            entries[active]?.run();
          } else if (event.key === "Escape") {
            onClose();
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={17} className="text-ink-faint" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Search everything, or create…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-ink-faint"
          />
        </div>
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-1.5">
          {entries.map((entry, i) => (
            <div key={entry.id}>
              {entry.group !== entries[i - 1]?.group && <div className="sw-menu-label">{entry.group}</div>}
              <button
                type="button"
                data-index={i}
                data-active={i === active}
                className="sw-menu-item"
                onMouseEnter={() => setActive(i)}
                onClick={entry.run}
              >
                <span className="text-ink-soft">{entry.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{entry.title}</span>
                  {entry.hint && <span className="block truncate text-xs text-ink-faint">{entry.hint}</span>}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
