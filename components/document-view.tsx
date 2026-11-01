"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  Check,
  Download,
  Ellipsis,
  History,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Printer,
  Trash,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { toMarkdown, toStructured } from "@/lib/content";
import {
  DOC_KINDS,
  DOC_STATUSES,
  KIND_INFO,
  STATUS_INFO,
  displayTitle,
  type DocKind,
  type DocStatus,
  type DocSummary,
  type FullDoc,
} from "@/lib/model";
import { timeAgo } from "@/lib/time";
import { KIND_ICONS } from "@/components/icons";
import { Menu } from "@/components/menu";
import { useDocuments } from "@/components/documents-store";
import { usePreferences } from "@/components/preferences";
import { HistoryPanel } from "@/components/history-panel";
import { StatusDot } from "@/components/status-dot";
import { StoryEditor } from "@/components/editor/story-editor";

type SaveState = "saved" | "unsaved" | "saving" | "error";
type Pending = { title?: string; content?: boolean };

const SAVE_DELAY = 800;
const RETRY_DELAY = 5000;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileName(title: string) {
  return (title.trim() || "untitled").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function DocumentView({ doc }: { doc: FullDoc }) {
  const router = useRouter();
  const store = useDocuments();
  const prefs = usePreferences();
  const summary = store.docsById.get(doc.id) ?? doc;

  const [title, setTitle] = useState(doc.title);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const pending = useRef<Pending>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const editorRef = useRef<Editor | null>(null);
  const retryRef = useRef<() => void>(() => {});
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  });

  const flush = useCallback(
    (keepalive = false) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const batch = pending.current;
      if (batch.title === undefined && !batch.content) return chain.current;
      pending.current = {};

      const body: Record<string, unknown> = {};
      if (batch.title !== undefined) body.title = batch.title;
      if (batch.content && editorRef.current) body.content = editorRef.current.getJSON();

      const small = JSON.stringify(body).length < 60_000;
      setSaveState("saving");
      chain.current = chain.current.then(async () => {
        try {
          const { document } = await api<{ document: DocSummary }>(`/api/documents/${doc.id}`, {
            method: "PATCH",
            body,
            keepalive: keepalive && small,
          });
          storeRef.current.upsert(document);
          const stillDirty = pending.current.title !== undefined || pending.current.content;
          setSaveState(stillDirty ? "unsaved" : "saved");
        } catch {
          pending.current = {
            title: pending.current.title ?? batch.title,
            content: pending.current.content || batch.content,
          };
          setSaveState("error");
          timer.current = setTimeout(() => retryRef.current(), RETRY_DELAY);
        }
      });
      return chain.current;
    },
    [doc.id],
  );

  useEffect(() => {
    retryRef.current = () => void flush();
  }, [flush]);

  const queue = useCallback(
    (patch: Pending) => {
      Object.assign(pending.current, patch);
      setSaveState("unsaved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush(true);
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      if (pending.current.title !== undefined || pending.current.content) {
        void flush(true);
        event.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      void flush(true);
    };
  }, [flush]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    if (!doc.title) titleRef.current?.focus();
  }, [doc.title]);

  const onReady = useCallback((e: Editor) => {
    editorRef.current = e;
    setEditor(e);
  }, []);

  const outline = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return { items: [] as { pos: number; type: string; text: string; level: number }[], words: 0 };
      const items: { pos: number; type: string; text: string; level: number }[] = [];
      e.state.doc.forEach((node, pos) => {
        if (node.type.name === "stage" || node.type.name === "heading" || node.type.name === "scene") {
          items.push({ pos, type: node.type.name, text: node.textContent, level: Number(node.attrs.level ?? 2) });
        }
      });
      return { items, words: e.storage.characterCount.words() };
    },
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  }) ?? { items: [], words: 0 };

  const restore = async (version: { title: string; content: unknown }) => {
    await flush();
    const { document } = await api<{ document: DocSummary }>(`/api/documents/${doc.id}`, {
      method: "PATCH",
      body: { title: version.title, content: version.content, snapshotBefore: true },
    });
    store.upsert(document);
    editorRef.current?.commands.setContent(version.content as object, { emitUpdate: false });
    setTitle(version.title);
    setSaveState("saved");
    setHistoryOpen(false);
  };

  const exportAs = (format: "md" | "json") => {
    const content = editorRef.current?.getJSON();
    const name = fileName(title);
    if (format === "md") download(`${name}.md`, toMarkdown(title, content), "text/markdown");
    else
      download(
        `${name}.json`,
        JSON.stringify(toStructured({ title, kind: summary.kind, status: summary.status }, content), null, 2),
        "application/json",
      );
  };

  const moveToTrash = async () => {
    await flush();
    await store.trash(doc.id);
    router.push("/");
  };

  const backlinks = store.docs.filter((d) => d.id !== doc.id && d.links.some((l) => l.to === doc.id));
  const KindIcon = KIND_ICONS[summary.kind];
  const focus = prefs.focusMode;
  let stageNumber = 0;

  return (
    <div className={`relative flex h-full min-w-0 ${focus ? "sw-focus" : ""}`}>
      <div ref={scrollRef} className="sw-print-full min-w-0 flex-1 overflow-y-auto">
        <div
          className={`sw-no-print sticky top-0 z-20 flex items-center gap-2 bg-bg/80 px-4 py-2.5 backdrop-blur transition-opacity duration-500 sm:px-6 ${
            focus ? "opacity-0 hover:opacity-100" : ""
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-10 text-sm text-ink-soft md:pl-0">
            <KindIcon size={15} className="shrink-0 text-ink-faint" />
            <span className="truncate">{displayTitle(title, summary.kind)}</span>
            <SaveIndicator state={saveState} />
          </div>

          <span className="hidden text-xs text-ink-faint sm:inline">{outline.words.toLocaleString()} words</span>

          <IconButton
            label={prefs.sounds ? "Typewriter sounds on" : "Typewriter sounds off"}
            onClick={() => prefs.setSounds(!prefs.sounds)}
          >
            {prefs.sounds ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </IconButton>
          <IconButton label={focus ? "Leave focus mode (Esc)" : "Focus mode"} onClick={() => prefs.setFocusMode(!focus)}>
            {focus ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </IconButton>
          <IconButton label="History" onClick={() => setHistoryOpen(true)}>
            <History size={17} />
          </IconButton>
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <IconButton label="More" onClick={toggle}>
                <Ellipsis size={17} />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <button
                  type="button"
                  className="sw-menu-item"
                  onClick={() => {
                    void store.update(doc.id, { pinned: !summary.pinned });
                    close();
                  }}
                >
                  {summary.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                  {summary.pinned ? "Unpin from sidebar" : "Pin to sidebar"}
                </button>
                <div className="sw-menu-label">Export</div>
                <button type="button" className="sw-menu-item" onClick={() => (exportAs("md"), close())}>
                  <Download size={15} /> Markdown (.md)
                </button>
                <button type="button" className="sw-menu-item" onClick={() => (exportAs("json"), close())}>
                  <Download size={15} /> JSON for the game (.json)
                </button>
                <button type="button" className="sw-menu-item" onClick={() => (close(), setTimeout(() => window.print(), 50))}>
                  <Printer size={15} /> Print or save as PDF
                </button>
                <div className="my-1 border-t border-line" />
                <button type="button" className="sw-menu-item !text-[var(--c-effects)]" onClick={() => (close(), void moveToTrash())}>
                  <Trash size={15} /> Move to trash
                </button>
              </>
            )}
          </Menu>
        </div>

        <div className="px-0 pb-24 pt-2 sm:px-6 sm:pt-6">
          <article className="sw-page mx-auto min-h-[70vh] max-w-[48rem] px-6 py-10 sm:rounded-2xl sm:px-14 sm:py-14">
            <div className={`sw-no-print mb-5 flex flex-wrap items-center gap-2 transition-opacity ${focus ? "opacity-0" : ""}`}>
              <Menu
                trigger={({ toggle }) => (
                  <button type="button" className="sw-chip" onClick={toggle}>
                    <KindIcon size={13} /> {KIND_INFO[summary.kind].label}
                  </button>
                )}
              >
                {(close) =>
                  DOC_KINDS.map((kind: DocKind) => {
                    const Icon = KIND_ICONS[kind];
                    return (
                      <button
                        key={kind}
                        type="button"
                        className="sw-menu-item"
                        data-active={kind === summary.kind}
                        onClick={() => {
                          void store.update(doc.id, { kind });
                          close();
                        }}
                      >
                        <Icon size={15} /> {KIND_INFO[kind].label}
                      </button>
                    );
                  })
                }
              </Menu>
              <Menu
                trigger={({ toggle }) => (
                  <button type="button" className="sw-chip" onClick={toggle}>
                    <StatusDot status={summary.status} /> {STATUS_INFO[summary.status].label}
                  </button>
                )}
              >
                {(close) =>
                  DOC_STATUSES.map((status: DocStatus) => (
                    <button
                      key={status}
                      type="button"
                      className="sw-menu-item"
                      data-active={status === summary.status}
                      onClick={() => {
                        void store.update(doc.id, { status });
                        close();
                      }}
                    >
                      <StatusDot status={status} /> {STATUS_INFO[status].label}
                    </button>
                  ))
                }
              </Menu>
              {summary.pinned && (
                <span className="sw-chip !cursor-default">
                  <Pin size={12} /> Pinned
                </span>
              )}
              <span className="ml-auto text-xs text-ink-faint">Edited {timeAgo(summary.updatedAt)}</span>
            </div>

            <textarea
              ref={titleRef}
              rows={1}
              value={title}
              placeholder={`Untitled ${KIND_INFO[summary.kind].label.toLowerCase()}`}
              className="mb-6 w-full resize-none overflow-hidden bg-transparent font-display text-3xl leading-tight text-ink outline-none placeholder:text-ink-faint sm:text-4xl"
              onChange={(event) => {
                const next = event.target.value.replace(/\n/g, " ");
                setTitle(next);
                queue({ title: next });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || (event.key === "ArrowDown" && !event.shiftKey)) {
                  event.preventDefault();
                  editorRef.current?.commands.focus("start");
                }
              }}
            />

            <StoryEditor content={doc.content} scrollRef={scrollRef} onChange={() => queue({ content: true })} onReady={onReady} />

            {backlinks.length > 0 && (
              <section className="sw-no-print mt-4 border-t border-line pt-5">
                <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-ink-faint">Mentioned in</h3>
                <div className="flex flex-wrap gap-2">
                  {backlinks.map((d) => {
                    const Icon = KIND_ICONS[d.kind];
                    return (
                      <Link key={d.id} href={`/d/${d.id}`} className="sw-chip">
                        <Icon size={13} /> {displayTitle(d.title, d.kind)}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </article>
        </div>
      </div>

      {outline.items.length > 1 && !focus && (
        <nav className="sw-no-print hidden w-56 shrink-0 overflow-y-auto py-20 pr-4 2xl:block">
          <div className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-faint">On this page</div>
          <ul className="space-y-1 border-l border-line text-sm">
            {outline.items.map((item) => {
              if (item.type === "stage") stageNumber++;
              return (
                <li key={item.pos}>
                  <button
                    type="button"
                    className={`block w-full truncate py-0.5 text-left text-ink-soft hover:text-ink ${
                      item.type === "heading" && item.level === 3 ? "pl-6" : "pl-3"
                    }`}
                    onClick={() => {
                      editorRef.current?.chain().focus(item.pos + 1).scrollIntoView().run();
                    }}
                  >
                    {item.type === "stage" && <span className="mr-1.5 text-accent">{stageNumber}.</span>}
                    {item.type === "scene" ? item.text.toUpperCase() || "Scene" : item.text || "Untitled"}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {historyOpen && <HistoryPanel docId={doc.id} onClose={() => setHistoryOpen(false)} onRestore={restore} />}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-hover hover:text-ink"
    >
      {children}
    </button>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text = { saved: "Saved", unsaved: "Unsaved", saving: "Saving…", error: "Offline, retrying…" }[state];
  return (
    <span
      className={`ml-1 inline-flex shrink-0 items-center gap-1 text-xs transition-colors ${
        state === "error" ? "text-[var(--c-effects)]" : "text-ink-faint"
      }`}
    >
      {state === "saved" ? <Check size={12} /> : <span className={`size-1.5 rounded-full ${state === "error" ? "bg-[var(--c-effects)]" : "bg-spark"}`} />}
      {text}
    </span>
  );
}
