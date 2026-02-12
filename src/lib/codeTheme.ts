import type { CSSProperties } from "react";

// Catppuccin Mocha palette for code blocks (always dark regardless of app theme)
export const CODE_BG = "#1e1e2e";       // Mocha Base
export const CODE_MANTLE = "#181825";    // Mocha Mantle
export const CODE_BORDER = "#45475a";    // Mocha Surface1
export const CODE_TEXT = "#cdd6f4";      // Mocha Text
export const CODE_SUBTEXT = "#a6adc8";   // Mocha Subtext0

export function buildCodeSyntaxTheme(fontCode: string): Record<string, CSSProperties> {
  return {
    'code[class*="language-"]': {
      color: CODE_TEXT,
      fontFamily: fontCode,
      fontSize: "12px",
      lineHeight: "1.5",
    },
    'pre[class*="language-"]': {
      color: CODE_TEXT,
      fontFamily: fontCode,
      fontSize: "12px",
      lineHeight: "1.5",
      margin: 0,
      padding: "12px",
      overflow: "auto",
      background: CODE_BG,
    },
    comment: { color: "#6c7086" },      // Overlay0
    prolog: { color: "#6c7086" },
    doctype: { color: "#6c7086" },
    cdata: { color: "#6c7086" },
    punctuation: { color: "#bac2de" },   // Subtext1
    property: { color: "#f38ba8" },      // Red
    tag: { color: "#f38ba8" },
    boolean: { color: "#fab387" },       // Peach
    number: { color: "#fab387" },
    constant: { color: "#fab387" },
    symbol: { color: "#f38ba8" },
    deleted: { color: "#f38ba8" },
    selector: { color: "#a6e3a1" },      // Green
    "attr-name": { color: "#f9e2af" },   // Yellow
    string: { color: "#a6e3a1" },
    char: { color: "#a6e3a1" },
    builtin: { color: "#a6e3a1" },
    inserted: { color: "#a6e3a1" },
    operator: { color: "#89dceb" },      // Sky
    entity: { color: "#89dceb" },
    url: { color: "#89dceb" },
    atrule: { color: "#cba6f7" },        // Mauve
    "attr-value": { color: "#cba6f7" },
    keyword: { color: "#cba6f7" },
    function: { color: "#89b4fa" },      // Blue
    "class-name": { color: "#f9e2af" },  // Yellow
    regex: { color: "#fab387" },         // Peach
    important: { color: "#f38ba8", fontWeight: "bold" },
    variable: { color: CODE_TEXT },
  };
}
