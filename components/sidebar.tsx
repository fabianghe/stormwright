"use client";

import {
  ChevronRight,
  Download,
  House,
  LogOut,
  Monitor,
  Moon,
  Network,
  PanelLeftClose,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
  Sun,
  Trash,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type MutableRefObject } from "react";
import { APP_NAME } from "@/lib/brand";
import { api } from "@/lib/client-api";
import { toAIHandoff } from "@/lib/content";
import { DOC_KINDS, KIND_INFO, displayTitle, type DocKind, type DocSummary, type FullDoc } from "@/lib/model";
import { MODES, PALETTES, type Mode, type Palette } from "@/lib/theme";
import { KIND_ICONS } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { Menu } from "@/components/menu";
import { StatusDot } from "@/components/status-dot";
import { useDocuments } from "@/components/documents-store";
import { usePreferences } from "@/components/preferences";

const MODE_ICONS: Record<Mode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

export function NewDocumentMenu({ align = "left", wide = true }: { align?: "left" | "right"; wide?: boolean }) {
  const store = useDocuments();
  return (
    <Menu
      align={align}
      className="w-72"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className={`sw-btn sw-btn-primary ${wide ? "w-full justify-center" : ""}`}>
          <Plus size={16} /> New
        </button>
      )}
    >
      {(close) =>
        DOC_KINDS.map((kind) => {
          const Icon = KIND_ICONS[kind];
          return (
            <button
              key={kind}
              type="button"
              className="sw-menu-item"
              onClick={() => {
                close();
                void store.create(kind);
              }}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface">
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block">{KIND_INFO[kind].label}</span>
                <span className="block truncate text-xs text-ink-faint">{KIND_INFO[kind].blurb}</span>
              </span>
            </button>
          );
        })
      }
    </Menu>
  );
}

function DocRow({
  doc,
  active,
  onNavigate,
  justDragged,
}: {
  doc: DocSummary;
  active: boolean;
  onNavigate: () => void;
  justDragged: MutableRefObject<boolean>;
}) {
  const store = useDocuments();
  const Icon = KIND_ICONS[doc.kind];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`group relative flex touch-manipulation select-none items-center rounded-lg pr-1 transition-colors ${
        active ? "bg-accent-soft text-ink" : "text-ink-soft hover:bg-hover hover:text-ink"
      } ${isDragging ? "z-10 bg-raised shadow-lg ring-1 ring-line" : ""}`}
    >
      <Link
        href={`/d/${doc.id}`}
        draggable={false}
        onClick={(event) => {
          if (justDragged.current) event.preventDefault();
          else onNavigate();
        }}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-1.5 pl-2.5 text-[0.88rem]"
      >
        <Icon size={14} className={active ? "shrink-0 text-accent" : "shrink-0 text-ink-faint"} />
        <span className="truncate">{displayTitle(doc.title, doc.kind)}</span>
        <StatusDot status={doc.status} className="ml-auto opacity-70" />
      </Link>
      <button
        type="button"
        title={doc.pinned ? "Unpin" : "Pin"}
        className="ml-1 grid size-6 shrink-0 place-items-center rounded-md text-ink-faint opacity-0 hover:bg-hover hover:text-ink group-hover:opacity-100"
        onClick={() => void store.update(doc.id, { pinned: !doc.pinned })}
      >
        {doc.pinned ? <PinOff size={13} /> : <Pin size={13} />}
      </button>
    </div>
  );
}

function Section({
  title,
  docs,
  activeId,
  onNavigate,
  initiallyOpen = true,
}: {
  title: string;
  docs: DocSummary[];
  activeId: string | null;
  onNavigate: () => void;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const store = useDocuments();
  const justDragged = useRef(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setTimeout(() => (justDragged.current = false), 0);
    if (!over || active.id === over.id) return;
    const ids = docs.map((d) => d.id);
    const moved = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    store.reorder(moved, String(active.id));
  };

  if (!docs.length) return null;
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mb-1 flex w-full items-center gap-1 px-2.5 text-[0.68rem] uppercase tracking-[0.16em] text-ink-faint hover:text-ink-soft"
      >
        <ChevronRight size={12} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        {title}
        <span className="ml-auto tabular-nums">{docs.length}</span>
      </button>
      {open && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => (justDragged.current = true)}
          onDragCancel={() => (justDragged.current = false)}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={docs.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-px">
              {docs.map((doc) => (
                <DocRow key={doc.id} doc={doc} active={doc.id === activeId} onNavigate={onNavigate} justDragged={justDragged} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SettingsMenu({ username }: { username: string }) {
  const prefs = usePreferences();
  const { theme, setTheme } = prefs;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const exportProject = async (close: () => void) => {
    setExporting(true);
    setExportError(false);
    try {
      const { documents } = await api<{ documents: FullDoc[] }>("/api/documents/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(toAIHandoff(documents), null, 2)], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `gameweft-project-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      close();
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Menu
      side="top"
      className="w-72"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-hover">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm uppercase text-accent-ink">
            {username.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">{username}</span>
          <Settings size={15} className="text-ink-faint" />
        </button>
      )}
    >
      {() => (
        <>
          <div className="sw-menu-label">Palette</div>
          {(Object.keys(PALETTES) as Palette[]).map((palette) => (
            <button
              key={palette}
              type="button"
              className="sw-menu-item"
              data-active={theme.palette === palette}
              onClick={() => setTheme({ ...theme, palette })}
            >
              <span data-palette={palette} className="flex shrink-0 overflow-hidden rounded-md border border-line">
                <span className="size-4" style={{ background: "var(--bg)" }} />
                <span className="size-4" style={{ background: "var(--ink)" }} />
                <span className="size-4" style={{ background: "var(--accent)" }} />
              </span>
              <span className="min-w-0">
                <span className="block">{PALETTES[palette].label}</span>
                <span className="block truncate text-xs text-ink-faint">{PALETTES[palette].blurb}</span>
              </span>
            </button>
          ))}
          <div className="sw-menu-label">Mode</div>
          <div className="grid grid-cols-3 gap-1 px-1 pb-1">
            {(Object.keys(MODES) as Mode[]).map((mode) => {
              const Icon = MODE_ICONS[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme({ ...theme, mode })}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs ${
                    theme.mode === mode ? "border-accent text-accent" : "border-line text-ink-soft hover:bg-hover"
                  }`}
                >
                  <Icon size={15} />
                  {MODES[mode]}
                </button>
              );
            })}
          </div>
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            className="sw-menu-item"
            disabled={exporting}
            onClick={() => void exportProject(close)}
          >
            <Download size={15} /> {exporting ? "Preparing export..." : "Export project for AI (.json)"}
          </button>
          {exportError && <p className="px-2.5 py-1 text-xs text-(--c-effects)">Export failed. Please try again.</p>}
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            className="sw-menu-item"
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" }).catch(() => {});
              window.location.href = "/login";
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </>
      )}
    </Menu>
  );
}

export function Sidebar({ username, onOpenSearch }: { username: string; onOpenSearch: () => void }) {
  const pathname = usePathname();
  const store = useDocuments();
  const prefs = usePreferences();
  const activeId = pathname.startsWith("/d/") ? pathname.slice(3) : null;
  const pinned = store.docs.filter((d) => d.pinned);

  const onNavigate = () => {
    if (window.matchMedia("(max-width: 767px)").matches) prefs.setSidebarOpen(false);
  };

  const navLink = (href: string, label: string, Icon: typeof House) => (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[0.9rem] transition-colors ${
        pathname === href ? "bg-accent-soft text-ink" : "text-ink-soft hover:bg-hover hover:text-ink"
      }`}
    >
      <Icon size={15} className={pathname === href ? "text-accent" : "text-ink-faint"} />
      {label}
    </Link>
  );

  return (
    <aside className="flex h-full w-72 flex-col border-r border-line bg-panel">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <LogoMark />
        <Link href="/" onClick={onNavigate} className="font-display text-xl tracking-wide">
          {APP_NAME}
        </Link>
        <button
          type="button"
          title="Hide sidebar"
          className="ml-auto grid size-8 place-items-center rounded-lg text-ink-faint hover:bg-hover hover:text-ink"
          onClick={() => prefs.setSidebarOpen(false)}
        >
          <PanelLeftClose size={17} />
        </button>
      </div>

      <div className="space-y-2 px-3">
        <NewDocumentMenu />
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink-faint hover:text-ink-soft"
        >
          <Search size={15} />
          Search
          <kbd className="ml-auto rounded border border-line px-1.5 text-[0.7rem]">⌘K</kbd>
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {navLink("/", "Home", House)}
        {navLink("/map", "Quest map", Network)}

        <Section title="Pinned" docs={pinned} activeId={activeId} onNavigate={onNavigate} />
        {DOC_KINDS.map((kind: DocKind) => (
          <Section
            key={kind}
            title={KIND_INFO[kind].plural}
            docs={store.docs.filter((d) => d.kind === kind && !d.pinned)}
            activeId={activeId}
            onNavigate={onNavigate}
          />
        ))}

        {store.docs.length === 0 && (
          <p className="mt-6 px-2.5 text-sm leading-relaxed text-ink-faint">
            Nothing here yet. Press <span className="text-ink-soft">New</span> to write your first quest.
          </p>
        )}
      </nav>

      <div className="border-t border-line p-2">
        {navLink("/trash", "Trash", Trash)}
        <SettingsMenu username={username} />
      </div>
    </aside>
  );
}
