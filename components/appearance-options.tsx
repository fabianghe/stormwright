"use client";

import { ChevronDown, Monitor, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { MODES, PALETTES, type Mode, type Palette } from "@/lib/theme";
import { playKey } from "@/lib/typewriter-sound";
import { Menu } from "@/components/menu";
import { usePreferences } from "@/components/preferences";

const MODE_ICONS: Record<Mode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

export function PaletteSwatch({ palette }: { palette: Palette }) {
  return (
    <span data-palette={palette} className="flex shrink-0 overflow-hidden rounded-md border border-line">
      <span className="size-4" style={{ background: "var(--bg)" }} />
      <span className="size-4" style={{ background: "var(--ink)" }} />
      <span className="size-4" style={{ background: "var(--accent)" }} />
    </span>
  );
}

export function AppearanceOptions() {
  const { theme, setTheme, sounds, setSounds } = usePreferences();

  return (
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
          <PaletteSwatch palette={palette} />
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
        role="switch"
        aria-checked={sounds}
        className="sw-menu-item"
        onClick={() => {
          if (!sounds) playKey();
          setSounds(!sounds);
        }}
      >
        {sounds ? <Volume2 size={15} /> : <VolumeX size={15} className="text-ink-faint" />}
        <span className="flex-1">Typewriter sounds</span>
        <span
          className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${sounds ? "bg-accent" : "bg-line"}`}
          aria-hidden
        >
          <span
            className={`absolute top-0.5 size-3 rounded-full bg-surface shadow-sm transition-[left] ${
              sounds ? "left-3.5" : "left-0.5"
            }`}
          />
        </span>
      </button>
    </>
  );
}

export function AppearanceMenu() {
  const { theme, sounds } = usePreferences();
  return (
    <Menu
      className="max-h-[70vh] w-72 overflow-y-auto"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm hover:bg-hover"
          title="Palette and typewriter sounds"
        >
          <PaletteSwatch palette={theme.palette} />
          <span className="min-w-0 flex-1 truncate">{PALETTES[theme.palette].label}</span>
          {sounds ? <Volume2 size={15} className="text-ink-faint" /> : <VolumeX size={15} className="text-ink-faint" />}
          <ChevronDown size={14} className="text-ink-faint" />
        </button>
      )}
    >
      {() => <AppearanceOptions />}
    </Menu>
  );
}
