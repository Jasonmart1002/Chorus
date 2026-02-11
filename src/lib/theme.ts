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
  bgBase: "#EDE4D8",
  bgSidebar: "#DDD0E8",
  bgSurface: "#F5EDE2",
  bgCard: "#F0E8DD",

  borderColor: "#B8A4C8",

  textPrimary: "#1E1A22",
  textSecondary: "#504A54",
  textMuted: "#7E7884",

  lavender: "#8B6BAA",
  lavenderLight: "#D5C8E2",
  mint: "#4AAF7E",
  mintLight: "#B8E0CC",
  peach: "#D87068",
  peachLight: "#F0CCC8",
  butter: "#C8A840",
  butterLight: "#E8DDB8",
  mauve: "#B8A4C8",

  fontHeading: "'Space Mono', monospace",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontCode: "'JetBrains Mono', monospace",

  shadowChunky: "2px 3px 0 #B8A4C8",
  shadowDialog: "4px 6px 0 rgba(139,107,170,0.35)",

  easeSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export const darkTheme: ThemeColors = {
  bgBase: "#1A1625",
  bgSidebar: "#211C2E",
  bgSurface: "#242030",
  bgCard: "#2C2638",

  borderColor: "#3E3650",

  textPrimary: "#EDE8F2",
  textSecondary: "#B8B0C4",
  textMuted: "#7A7288",

  lavender: "#B898D4",
  lavenderLight: "#352A4A",
  mint: "#5EE09E",
  mintLight: "#1A3028",
  peach: "#F28878",
  peachLight: "#382028",
  butter: "#E8CC58",
  butterLight: "#332E1A",
  mauve: "#5E4E72",

  fontHeading: "'Space Mono', monospace",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontCode: "'JetBrains Mono', monospace",

  shadowChunky: "2px 3px 0 rgba(0,0,0,0.5)",
  shadowDialog: "4px 6px 0 rgba(0,0,0,0.6)",

  easeSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};
