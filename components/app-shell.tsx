"use client";

import { PanelLeft } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { DocSummary } from "@/lib/model";
import type { Theme } from "@/lib/theme";
import { CommandPalette } from "@/components/command-palette";
import { DocumentsProvider } from "@/components/documents-store";
import { PreferencesProvider, usePreferences } from "@/components/preferences";
import { Sidebar } from "@/components/sidebar";

function Frame({ username, children }: { username: string; children: ReactNode }) {
  const prefs = usePreferences();
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const open = prefs.focusMode ? false : prefs.sidebarOpen;
  const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((o) => !o);
      } else if (mod && event.key === "\\") {
        event.preventDefault();
        prefs.setSidebarOpen(!(prefs.sidebarOpen ?? isDesktop()));
      } else if (mod && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        prefs.setFocusMode(!prefs.focusMode);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs]);

  return (
    <div className="relative z-10 flex h-full">
      <div
        className={`sw-no-print fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:static md:z-auto md:transition-[margin] ${
          open === null
            ? "-translate-x-full md:ml-0 md:translate-x-0"
            : open
              ? "translate-x-0 md:ml-0"
              : "-translate-x-full md:-ml-72 md:translate-x-0"
        }`}
      >
        <Sidebar username={username} onOpenSearch={() => setSearchOpen(true)} />
      </div>
      {open === true && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="sw-no-print fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => prefs.setSidebarOpen(false)}
        />
      )}
      {open !== true && !prefs.focusMode && (
        <button
          type="button"
          title="Show sidebar (⌘\)"
          className={`sw-no-print fixed left-3 top-2.5 z-30 grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-hover hover:text-ink ${
            open === null ? "md:hidden" : ""
          }`}
          onClick={() => prefs.setSidebarOpen(true)}
        >
          <PanelLeft size={18} />
        </button>
      )}
      <main className="sw-print-full min-w-0 flex-1">{children}</main>
      {searchOpen && <CommandPalette onClose={closeSearch} />}
    </div>
  );
}

export function AppShell({
  username,
  documents,
  theme,
  sounds,
  children,
}: {
  username: string;
  documents: DocSummary[];
  theme: Theme;
  sounds: boolean;
  children: ReactNode;
}) {
  return (
    <PreferencesProvider initialTheme={theme} initialSounds={sounds}>
      <DocumentsProvider initial={documents}>
        <Frame username={username}>{children}</Frame>
      </DocumentsProvider>
    </PreferencesProvider>
  );
}
