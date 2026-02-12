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

  // Accents
  pink: string;
  pinkLight: string;
  mint: string;
  mintLight: string;
  peach: string;
  peachLight: string;
  gold: string;
  goldLight: string;
  lavender: string;

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

  // Accents
  pink: "#ea76cb",         // Pink
  pinkLight: "#f2dce8",    // Pink blended over Base
  mint: "#40a02b",         // Green
  mintLight: "#ddf0d8",    // Green blended over Base
  peach: "#d20f39",        // Red
  peachLight: "#f0d5da",   // Red blended over Base
  gold: "#df8e1d",         // Yellow
  goldLight: "#f0e4cf",    // Yellow blended over Base
  lavender: "#7287fd",     // Lavender

  // Tab pastels -- Mocha accents used as pastels
  pastel0: "#f5c2e7",
  pastel1: "#b4befe",
  pastel2: "#a6e3a1",
  pastel3: "#fab387",
  pastel4: "#89dceb",
  pastel5: "#f2cdcd",

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

  // Accents
  pink: "#f5c2e7",         // Pink
  pinkLight: "#2e2035",    // Pink on dark blend
  mint: "#a6e3a1",         // Green
  mintLight: "#1e2e20",    // Green on dark blend
  peach: "#f38ba8",        // Red
  peachLight: "#2e2025",   // Red on dark blend
  gold: "#f9e2af",         // Yellow
  goldLight: "#2e2a1e",    // Yellow on dark blend
  lavender: "#b4befe",     // Lavender

  // Tab pastels -- dark tinted jewel tones
  pastel0: "#352535",
  pastel1: "#2d2b45",
  pastel2: "#253530",
  pastel3: "#352d25",
  pastel4: "#253545",
  pastel5: "#352530",

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
