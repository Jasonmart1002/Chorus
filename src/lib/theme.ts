export interface ThemeColors {
  // Backgrounds
  bgBase: string;
  bgSidebar: string;
  bgSurface: string;
  bgCard: string;

  // Borders
  borderColor: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accents
  lavender: string;
  lavenderLight: string;
  mint: string;
  mintLight: string;
  peach: string;
  peachLight: string;
  butter: string;
  butterLight: string;
  mauve: string;

  // Fonts
  fontHeading: string;
  fontBody: string;
  fontCode: string;

  // Shadows
  shadowChunky: string;
  shadowDialog: string;

  // Animation
  easeSpring: string;
}

export const lightTheme: ThemeColors = {
  // Catppuccin Latte
  bgBase: "#eff1f5",       // Base
  bgSidebar: "#e6e9ef",    // Mantle
  bgSurface: "#eff1f5",    // Base
  bgCard: "#e6e9ef",       // Mantle

  borderColor: "#acb0be",  // Surface2

  textPrimary: "#4c4f69",  // Text
  textSecondary: "#5c5f77", // Subtext1
  textMuted: "#9ca0b0",    // Overlay0

  lavender: "#7287fd",     // Lavender
  lavenderLight: "#d6dcf7", // Lavender tint on Base
  mint: "#40a02b",         // Green
  mintLight: "#d5e5d7",    // Green tint on Base
  peach: "#fe640b",        // Peach
  peachLight: "#f1dcd2",   // Peach tint on Base
  butter: "#df8e1d",       // Yellow
  butterLight: "#ede2d5",  // Yellow tint on Base
  mauve: "#acb0be",        // Surface2

  fontHeading: "'Space Mono', monospace",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontCode: "'JetBrains Mono', monospace",

  shadowChunky: "2px 3px 0 #acb0be",
  shadowDialog: "4px 6px 0 rgba(114,135,253,0.25)",

  easeSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export const darkTheme: ThemeColors = {
  // Catppuccin Mocha
  bgBase: "#1e1e2e",       // Base
  bgSidebar: "#181825",    // Mantle
  bgSurface: "#313244",    // Surface0
  bgCard: "#313244",       // Surface0

  borderColor: "#585b70",  // Surface2

  textPrimary: "#cdd6f4",  // Text
  textSecondary: "#bac2de", // Subtext1
  textMuted: "#7f849c",    // Overlay1

  lavender: "#b4befe",     // Lavender
  lavenderLight: "#35364d", // Lavender tint on Base
  mint: "#a6e3a1",         // Green
  mintLight: "#2e363c",    // Green tint on Base
  peach: "#fab387",        // Peach
  peachLight: "#383039",   // Peach tint on Base
  butter: "#f9e2af",       // Yellow
  butterLight: "#38363e",  // Yellow tint on Base
  mauve: "#585b70",        // Surface2

  fontHeading: "'Space Mono', monospace",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontCode: "'JetBrains Mono', monospace",

  shadowChunky: "2px 3px 0 rgba(0,0,0,0.5)",
  shadowDialog: "4px 6px 0 rgba(0,0,0,0.6)",

  easeSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};
