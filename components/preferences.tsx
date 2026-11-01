"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyTheme, type Theme } from "@/lib/theme";

type Preferences = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  sounds: boolean;
  setSounds: (on: boolean) => void;
  focusMode: boolean;
  setFocusMode: (on: boolean) => void;
  sidebarOpen: boolean | null;
  setSidebarOpen: (open: boolean) => void;
};

const PreferencesContext = createContext<Preferences | null>(null);
export const SOUNDS_COOKIE = "sw_sounds";

export function PreferencesProvider({
  initialTheme,
  initialSounds,
  children,
}: {
  initialTheme: Theme;
  initialSounds: boolean;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState(initialTheme);
  const [sounds, setSoundsState] = useState(initialSounds);
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  const setSounds = useCallback((on: boolean) => {
    document.cookie = `${SOUNDS_COOKIE}=${on ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    setSoundsState(on);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, sounds, setSounds, focusMode, setFocusMode, sidebarOpen, setSidebarOpen }),
    [theme, setTheme, sounds, setSounds, focusMode, sidebarOpen],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const prefs = useContext(PreferencesContext);
  if (!prefs) throw new Error("usePreferences must be used inside PreferencesProvider");
  return prefs;
}
