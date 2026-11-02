"use client";

import {
  Check,
  ChevronRight,
  ChevronDown,
  Folder,
  Download,
  House,
  Inbox,
  LogOut,
  MessageSquareHeart,
  Network,
  PanelLeftClose,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
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
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type MutableRefObject } from "react";
import { APP_NAME } from "@/lib/brand";
import { api } from "@/lib/client-api";
import { toAIHandoff } from "@/lib/content";
import { DOC_KINDS, KIND_INFO, displayTitle, docColor, type DocKind, type DocSummary, type FullDoc, type ProjectSummary } from "@/lib/model";
import { AppearanceOptions } from "@/components/appearance-options";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { KIND_ICONS } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { Menu } from "@/components/menu";
import { StatusDot } from "@/components/status-dot";
import { useDocuments } from "@/components/documents-store";
import { usePreferences } from "@/components/preferences";

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
        <Icon
          size={14}
          className={active ? "shrink-0 text-accent" : "shrink-0 text-ink-faint"}
          data-color={docColor(doc) ?? undefined}
        />
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
          id={`sidebar-${title}`}
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

function ProjectSwitcher({
  projects,
  activeProject,
  pathname,
}: {
  projects: ProjectSummary[];
  activeProject: ProjectSummary;
  pathname: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const renaming = useRef<string | null>(null);

  const startRename = (project: ProjectSummary) => {
    renaming.current = project.id;
    setRenamingId(project.id);
    setDraft(project.name);
    setError(null);
  };

  const cancelRename = () => {
    renaming.current = null;
    setRenamingId(null);
  };

  const saveRename = async (project: ProjectSummary) => {
    if (renaming.current !== project.id) return;
    cancelRename();
    const projectName = draft.trim();
    if (!projectName || projectName === project.name) return;
    setWorking(true);
    try {
      await api(`/api/projects/${project.id}`, { method: "PATCH", body: { name: projectName } });
      router.refresh();
    } catch {
      setError("Couldn't rename this project. Try again.");
    } finally {
      setWorking(false);
    }
  };

  const navigateToProject = () => {
    if (pathname === "/") router.refresh();
    else router.replace("/");
  };

  const switchProject = async (projectId: string, close: () => void) => {
    if (projectId === activeProject.id) {
      close();
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await api(`/api/projects/${projectId}/select`, { method: "POST", body: {} });
      close();
      navigateToProject();
    } catch {
      setError("Couldn't switch projects. Try again.");
    } finally {
      setWorking(false);
    }
  };

  const createProject = async (event: React.FormEvent<HTMLFormElement>, close: () => void) => {
    event.preventDefault();
    const projectName = name.trim();
    if (!projectName) return;
    setWorking(true);
    setError(null);
    try {
      await api("/api/projects", { body: { name: projectName } });
      close();
      navigateToProject();
    } catch {
      setError("Couldn't create this project. Try another name.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Menu
      className="w-72"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 text-left text-sm hover:bg-hover"
          title="Switch or create game project"
        >
          <Folder size={15} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate">{activeProject.name}</span>
          <ChevronDown size={14} className="shrink-0 text-ink-faint" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="sw-menu-label">Game projects</div>
          {projects.map((project) =>
            renamingId === project.id ? (
              <form
                key={project.id}
                className="px-1 py-0.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveRename(project);
                }}
              >
                <input
                  autoFocus
                  className="sw-input !py-1.5 text-sm"
                  value={draft}
                  maxLength={80}
                  aria-label="Project name"
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => void saveRename(project)}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    event.nativeEvent.stopImmediatePropagation();
                    cancelRename();
                  }}
                />
              </form>
            ) : (
              <div key={project.id} className="group flex items-center">
                <button
                  type="button"
                  className="sw-menu-item min-w-0 flex-1"
                  data-active={project.id === activeProject.id}
                  disabled={working}
                  onClick={() => void switchProject(project.id, close)}
                >
                  <Folder size={15} className="text-ink-faint" />
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                  {project.id === activeProject.id && <Check size={14} className="text-accent" />}
                </button>
                <button
                  type="button"
                  className="ml-1 grid size-7 shrink-0 place-items-center rounded-md text-ink-faint hover:bg-hover hover:text-ink focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  aria-label={`Rename ${project.name}`}
                  title="Rename"
                  disabled={working}
                  onClick={() => startRename(project)}
                >
                  <Pencil size={13} />
                </button>
              </div>
            ),
          )}
          <div className="my-1 border-t border-line" />
          <form className="space-y-2 p-2" onSubmit={(event) => void createProject(event, close)}>
            <label className="block text-xs text-ink-soft" htmlFor="new-game-project">New project</label>
            <input
              id="new-game-project"
              className="sw-input w-full"
              value={name}
              maxLength={80}
              placeholder="Game name"
              onChange={(event) => setName(event.target.value)}
            />
            <button type="submit" className="sw-btn sw-btn-primary w-full justify-center" disabled={working || !name.trim()}>
              <Plus size={15} /> {working ? "Working…" : "Create and switch"}
            </button>
          </form>
          {error && <p className="px-2.5 pb-2 text-xs text-(--c-effects)">{error}</p>}
        </>
      )}
    </Menu>
  );
}

function SettingsMenu({ username }: { username: string }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const exportProject = async (close: () => void) => {
    setExporting(true);
    setExportError(false);
    try {
      const { project, documents } = await api<{ project: ProjectSummary; documents: FullDoc[] }>("/api/documents/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(toAIHandoff(project, documents), null, 2)], { type: "application/json" }),
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
          <AppearanceOptions />
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

export function Sidebar({
  username,
  isOwner,
  projects,
  activeProject,
  onOpenSearch,
}: {
  username: string;
  isOwner: boolean;
  projects: ProjectSummary[];
  activeProject: ProjectSummary;
  onOpenSearch: () => void;
}) {
  const pathname = usePathname();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
        <span className="rounded-full border border-line px-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">
          Beta
        </span>
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
        <ProjectSwitcher projects={projects} activeProject={activeProject} pathname={pathname} />
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
        {isOwner && navLink("/feedback", "Feedback inbox", Inbox)}
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[0.9rem] text-ink-soft transition-colors hover:bg-hover hover:text-ink"
        >
          <MessageSquareHeart size={15} className="text-ink-faint" />
          Send feedback
        </button>
        {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} />}
        {navLink("/trash", "Trash", Trash)}
        <SettingsMenu username={username} />
      </div>
    </aside>
  );
}
