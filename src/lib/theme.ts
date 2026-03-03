export interface ThemeColors {
  // Backgrounds
  bgBase: string;
  bgSidebar: string;
  bgSurface: string;
  bgCard: string;

  // Borders
  borderColor: string;
  borderStrong: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Core accents (original)
  pink: string;
  pinkLight: string;
  mint: string;
  mintLight: string;
  peach: string;       // Note: maps to Catppuccin Red for error/danger states
  peachLight: string;
  gold: string;
  goldLight: string;
  lavender: string;

  // Full Catppuccin accent palette
  rosewater: string;
  flamingo: string;
  mauve: string;
  teal: string;
  sky: string;
  sapphire: string;
  blue: string;
  maroon: string;

  // Light variants for additional accents
  lavenderLight: string;
  tealLight: string;
  mauveLight: string;
  skyLight: string;
  blueLight: string;
  rosewaterLight: string;
  flamingoLight: string;

  // Tab pastels (rotating per agent)
  pastel0: string;
  pastel1: string;
  pastel2: string;
  pastel3: string;
  pastel4: string;
  pastel5: string;

  // Fonts
  fontHeading: string;
  fontBody: string;
  fontCode: string;

  // Semantic
  textOnAccent: string;
  overlayColor: string;
  hoverOverlay: string;

  // Elevation
  elevation1: string;

  // Shadows
  shadowChunky: string;
  shadowDialog: string;
  shadowHover: string;
  shadowPress: string;

  // Animation
  easeSpring: string;

  // Decorative
  accentGradient: string;
  warmGradient: string;
  coolGradient: string;
  dotPattern: string;
  cardHover: string;

  // Status
  statusWorking: string;
  statusReady: string;
  statusError: string;
  statusIdle: string;

  // Chunky border radii
  borderRadius: number;
  borderRadiusSm: number;
  borderRadiusXl: number;
  borderRadiusFull: number;
}

// ---------------------------------------------------------------------------
// Light theme -- Catppuccin Latte
// ---------------------------------------------------------------------------
export const lightTheme: ThemeColors = {
  // Backgrounds
  bgBase: "#eff1f5",       // Base
  bgSidebar: "#e6e9ef",    // Mantle
  bgSurface: "#eff1f5",    // Base
  bgCard: "#ccd0da",       // Surface0

  // Borders
  borderColor: "#bcc0cc",  // Surface1
  borderStrong: "#4c4f69", // Text

  // Text
  textPrimary: "#4c4f69",  // Text
  textSecondary: "#5c5f77", // Subtext1
  textMuted: "#9ca0b0",    // Overlay0

  // Core accents
  pink: "#ea76cb",         // Pink
  pinkLight: "#f2dce8",    // Pink blended over Base
  mint: "#40a02b",         // Green
  mintLight: "#ddf0d8",    // Green blended over Base
  peach: "#d20f39",        // Red (used for error/danger)
  peachLight: "#f0d5da",   // Red blended over Base
  gold: "#df8e1d",         // Yellow
  goldLight: "#f0e4cf",    // Yellow blended over Base
  lavender: "#7287fd",     // Lavender

  // Full Catppuccin Latte accents
  rosewater: "#dc8a78",
  flamingo: "#dd7878",
  mauve: "#8839ef",
  teal: "#179299",
  sky: "#04a5e5",
  sapphire: "#209fb5",
  blue: "#1e66f5",
  maroon: "#e64553",

  // Light variants (accent blended ~15% over Base)
  lavenderLight: "#dde0f8",
  tealLight: "#d5edea",
  mauveLight: "#e3d5f8",
  skyLight: "#d1ecf6",
  blueLight: "#d5e1fa",
  rosewaterLight: "#f2e5e1",
  flamingoLight: "#f2dfdf",

  // Tab pastels -- softer tints over Latte Base
  pastel0: "#fae4f4",      // Pink tint
  pastel1: "#dde2fc",      // Lavender tint
  pastel2: "#d9f0d5",      // Green tint
  pastel3: "#fde4d2",      // Peach tint (warm orange)
  pastel4: "#d2eef6",      // Sky tint
  pastel5: "#f5e0dc",      // Rosewater (naturally pastel)

  // Fonts
  fontHeading: "'Space Grotesk', sans-serif",
  fontBody: "'Nunito', sans-serif",
  fontCode: "'JetBrains Mono', monospace",

  // Semantic
  textOnAccent: "#eff1f5",                // Base
  overlayColor: "rgba(76,79,105,0.38)",   // Text@38%
  hoverOverlay: "rgba(234,118,203,0.10)", // Pink@10%

  // Elevation
  elevation1: "0 2px 6px rgba(76,79,105,0.10)",

  // Shadows -- hard offset with Overlay0 (neobrutalist)
  shadowChunky: "4px 4px 0px #9ca0b0",   // Overlay0
  shadowDialog: "7px 7px 0px #8c8fa1",   // Overlay1
  shadowHover: "6px 6px 0px #9ca0b0",    // Overlay0
  shadowPress: "1px 1px 0px #9ca0b0",    // Overlay0

  // Animation
  easeSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",

  // Decorative
  accentGradient: "linear-gradient(135deg, #ea76cb 0%, #8839ef 50%, #7287fd 100%)", // Pink→Mauve→Lavender
  warmGradient: "linear-gradient(135deg, #dc8a78 0%, #fe640b 50%, #df8e1d 100%)",   // Rosewater→Peach→Yellow
  coolGradient: "linear-gradient(135deg, #179299 0%, #1e66f5 50%, #7287fd 100%)",   // Teal→Blue→Lavender
  dotPattern: "radial-gradient(circle, #bcc0cc 1px, transparent 1px)", // Surface1
  cardHover: "#dce0e8",   // Crust

  // Status
  statusWorking: "#df8e1d", // Yellow
  statusReady: "#40a02b",   // Green
  statusError: "#d20f39",   // Red
  statusIdle: "#9ca0b0",    // Overlay0

  // Chunky radii
  borderRadius: 16,
  borderRadiusSm: 10,
  borderRadiusXl: 20,
  borderRadiusFull: 9999,
};

// ---------------------------------------------------------------------------
// Dark theme -- Catppuccin Mocha
// ---------------------------------------------------------------------------
export const darkTheme: ThemeColors = {
  // Backgrounds
  bgBase: "#1e1e2e",       // Base
  bgSidebar: "#181825",    // Mantle
  bgSurface: "#1e1e2e",    // Base
  bgCard: "#313244",       // Surface0

  // Borders
  borderColor: "#45475a",  // Surface1
  borderStrong: "#cdd6f4", // Text

  // Text
  textPrimary: "#cdd6f4",  // Text
  textSecondary: "#bac2de", // Subtext1
  textMuted: "#6c7086",    // Overlay0

  // Core accents
  pink: "#f5c2e7",         // Pink
  pinkLight: "#2e2035",    // Pink on dark blend
  mint: "#a6e3a1",         // Green
  mintLight: "#1e2e20",    // Green on dark blend
  peach: "#f38ba8",        // Red (used for error/danger)
  peachLight: "#2e2025",   // Red on dark blend
  gold: "#f9e2af",         // Yellow
  goldLight: "#2e2a1e",    // Yellow on dark blend
  lavender: "#b4befe",     // Lavender

  // Full Catppuccin Mocha accents
  rosewater: "#f5e0dc",
  flamingo: "#f2cdcd",
  mauve: "#cba6f7",
  teal: "#94e2d5",
  sky: "#89dceb",
  sapphire: "#74c7ec",
  blue: "#89b4fa",
  maroon: "#eba0ac",

  // Light variants (accent tinted on dark surface)
  lavenderLight: "#252540",
  tealLight: "#1e2e2c",
  mauveLight: "#2a2040",
  skyLight: "#1e2e38",
  blueLight: "#1e2840",
  rosewaterLight: "#2e2525",
  flamingoLight: "#2e2228",

  // Tab pastels -- richer dark jewel tones
  pastel0: "#382040",      // Pink deep
  pastel1: "#2c2848",      // Lavender deep
  pastel2: "#1e3828",      // Green deep
  pastel3: "#382c1e",      // Peach deep (warm)
  pastel4: "#1e3548",      // Sky deep
  pastel5: "#382228",      // Flamingo deep

  // Fonts
  fontHeading: "'Space Grotesk', sans-serif",
  fontBody: "'Nunito', sans-serif",
  fontCode: "'JetBrains Mono', monospace",

  // Semantic
  textOnAccent: "#1e1e2e",                // Base
  overlayColor: "rgba(17,17,27,0.58)",    // Crust@58%
  hoverOverlay: "rgba(245,194,231,0.08)", // Pink@8%

  // Elevation
  elevation1: "0 2px 6px rgba(17,17,27,0.35)",

  // Shadows -- hard offset Crust
  shadowChunky: "4px 4px 0px #11111b",   // Crust
  shadowDialog: "7px 7px 0px #11111b",   // Crust
  shadowHover: "6px 6px 0px #11111b",    // Crust
  shadowPress: "1px 1px 0px #11111b",    // Crust

  // Animation
  easeSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",

  // Decorative
  accentGradient: "linear-gradient(135deg, #f5c2e7 0%, #cba6f7 50%, #89b4fa 100%)", // Pink→Mauve→Blue
  warmGradient: "linear-gradient(135deg, #f5e0dc 0%, #fab387 50%, #f9e2af 100%)",   // Rosewater→Peach→Yellow
  coolGradient: "linear-gradient(135deg, #94e2d5 0%, #89b4fa 50%, #b4befe 100%)",   // Teal→Blue→Lavender
  dotPattern: "radial-gradient(circle, #313244 1px, transparent 1px)", // Surface0
  cardHover: "#45475a",   // Surface1

  // Status
  statusWorking: "#f9e2af", // Yellow
  statusReady: "#a6e3a1",   // Green
  statusError: "#f38ba8",   // Red
  statusIdle: "#6c7086",    // Overlay0

  // Chunky radii
  borderRadius: 16,
  borderRadiusSm: 10,
  borderRadiusXl: 20,
  borderRadiusFull: 9999,
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const PASTEL_KEYS = [
  "pastel0", "pastel1", "pastel2", "pastel3", "pastel4", "pastel5",
] as const;

export const spacing = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32,
} as const;

export const radius = {
  sm: 10, md: 16, lg: 20, full: 9999,
} as const;

export const typography = {
  xs: 10, sm: 12, base: 14, lg: 16, xl: 18,
} as const;
