export const THEME_COOKIE = "sw_theme";
export const SOUNDS_COOKIE = "sw_sounds";

export function parseSounds(value: string | undefined) {
  return value !== "0";
}

export const PALETTES = {
  paper: { label: "Paper & Ink", blurb: "Cream paper, ink and a ribbon-red accent" },
  storm: { label: "Storm at Dusk", blurb: "Rain-washed slate, lavender and a flash of lightning" },
  ember: { label: "Ember & Ash", blurb: "Ash-grey paper, charcoal and a glowing ember" },
  pine: { label: "Moonlit Pine", blurb: "Misty sage, pine ink and cold moonlight" },
  sand: { label: "Terracotta & Sand", blurb: "Warm sand, umber and terracotta clay" },
  aurora: { label: "Aurora", blurb: "Frost, deep navy and a green aurora glow" },
  script: { label: "Screenplay", blurb: "White paper and black type, inverted at night" },
} as const;
export type Palette = keyof typeof PALETTES;

export const MODES = { light: "Light", dark: "Dark", system: "Match device" } as const;
export type Mode = keyof typeof MODES;

export type Theme = { palette: Palette; mode: Mode };

export function parseTheme(value: string | undefined): Theme {
  const [palette, mode] = (value ?? "").split(".");
  return {
    palette: palette in PALETTES ? (palette as Palette) : "paper",
    mode: mode in MODES ? (mode as Mode) : "system",
  };
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.palette = theme.palette;
  root.dataset.mode = theme.mode;
  document.cookie = `${THEME_COOKIE}=${theme.palette}.${theme.mode}; path=/; max-age=31536000; samesite=lax`;
}

export function isDark(mode: Mode) {
  return mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
