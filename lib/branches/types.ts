// Shared shapes for per-branch config. No server-only imports: the POS
// terminals (client components) read these too. Shop details are public.

export type BranchId = "pos1" | "pos2";

export type ThemeColors = {
  primary: string; // buttons, highlights, accents
  primaryDark: string; // hover state of primary
  primaryLight: string;
  onPrimary: string; // text/icons drawn on top of `primary`
  tint: string; // very light primary wash
  background: string; // page background
  surface: string; // cards / invoice header
  border: string;
  muted: string; // subtle fills
  textMuted: string;
  textSoft: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
};

export type BranchConfig = {
  id: BranchId;
  shopName: string;
  shortName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  shopPhone: string;
  email: string;
  address: string;
  instagram: string;
  /** Full logo (invoices, wide spots). */
  logo: string;
  /** Square version of the logo for tiles and thumbnails. */
  logoMark: string;
  /** Backdrop behind the logo wherever it sits in a tile (matches the artwork). */
  logoBackground: string;
  icons: { icon192: string; icon512: string; maskable512: string; apple: string };
  /** Invoice numbers are `<prefix>-<year>-XXXXX`; must differ between branches. */
  invoicePrefix: string;
  /** Where the terminal lives (used for the installed-app start URL). */
  homePath: string;
  themes: readonly ThemePreset[];
  defaultThemeId: string;
};

const VAR_NAMES: Record<keyof ThemeColors, string> = {
  primary: "--brand-primary",
  primaryDark: "--brand-primary-dark",
  primaryLight: "--brand-primary-light",
  onPrimary: "--brand-on-primary",
  tint: "--brand-tint",
  background: "--brand-bg",
  surface: "--brand-surface",
  border: "--brand-border",
  muted: "--brand-muted",
  textMuted: "--brand-text-muted",
  textSoft: "--brand-text-soft",
};

export function resolveTheme(branch: BranchConfig, themeId?: string | null): ThemePreset {
  return (
    branch.themes.find((t) => t.id === themeId) ??
    branch.themes.find((t) => t.id === branch.defaultThemeId) ??
    branch.themes[0]
  );
}

/** `[cssVarName, value]` pairs for a theme. */
export function themeVarEntries(theme: ThemePreset): [string, string][] {
  return (Object.keys(VAR_NAMES) as (keyof ThemeColors)[]).map((k) => [
    VAR_NAMES[k],
    theme.colors[k],
  ]);
}

/** A `:root{...}` rule declaring the theme's CSS variables. */
export function themeCss(theme: ThemePreset): string {
  return `:root{${themeVarEntries(theme)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
}
