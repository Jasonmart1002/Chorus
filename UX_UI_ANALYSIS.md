# CC-Manager UX/UI Analysis

**Prepared for:** CC-Manager v0.1.0
**Date:** February 2026
**Scope:** Comprehensive production-readiness audit covering typography, spacing, layout, components, interaction design, accessibility, iconography, and motion

---

## Executive Summary

CC-Manager is a Tauri-based desktop application for managing multiple Claude Code agent sessions. The current implementation demonstrates solid engineering fundamentals — a centralized theme system, clean component decomposition, and a well-organized Zustand state layer. The Catppuccin Latte/Mocha color palette is an excellent choice that brings immediate visual credibility and community familiarity.

However, the UI currently reads as a **developer prototype** rather than a **shipping product**. The gap is not in capability but in polish: inconsistent spacing, an ad-hoc type scale, missing accessibility scaffolding, and inline style proliferation that makes systematic refinement difficult. What follows is a prioritized breakdown of every surface in the app with concrete recommendations to bring it to production quality.

---

## 1. Typography

### Current State

The app loads three font families from Google Fonts:

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| Headings | Space Mono | 400, 700 | Sidebar title, card names, dialog titles, button labels |
| Body | Inter | 400, 500, 600, 700 | Body text, labels, messages |
| Code | JetBrains Mono | 400, 500 | Command output, tool JSON, code blocks |

**Font sizes found across all components (px):**
10, 11, 12, 13, 14, 16, 18

### Issues

**No formal type scale.** Sizes are chosen per-component without a governing system. The result is that 10px, 11px, 12px, and 13px are all used for "small text" in slightly different contexts, making the hierarchy feel noisy rather than deliberate.

**Monospace heading font creates readability tension.** Space Mono at small sizes (11-13px) is charming but its fixed-width characters make dense UI labels harder to scan than they need to be. At 10px (`statusLabel`), it becomes actively difficult to read.

**`fontWeight: 600` is overused.** Nearly every text element uses semi-bold, which flattens the visual hierarchy. When everything is bold, nothing is bold.

**Line height inconsistency.** Message text uses `lineHeight: 1.5` in some places and `1.6` in others. The prompt textarea inherits `1.5`, but labels have no explicit line height at all.

### Recommendations

**Define a type scale and stick to it.** A modular scale based on a 1.2 ratio starting from a 14px base gives you clean stopping points:

| Token | Size | Usage |
|-------|------|-------|
| `xs` | 10px | Badges, counters, timestamps |
| `sm` | 12px | Labels, captions, secondary info |
| `base` | 14px | Body text, inputs, messages |
| `lg` | 16px | Section headers, dialog subtitles |
| `xl` | 18px | Dialog titles |
| `2xl` | 22px | Page headers (future use) |

**Restrict Space Mono to display contexts.** Use it for the app title, dialog titles, and the "New Agent" button — places where it adds personality. Switch card names, filter labels, status labels, and all small UI text to Inter. Space Mono at 10-11px is a readability penalty.

**Establish a weight system:**
- 400 (regular): body text, descriptions, secondary labels
- 500 (medium): input values, card names, interactive labels
- 600 (semi-bold): section headers, active states, primary buttons
- 700 (bold): dialog titles, app title only

**Standardize line heights:**
- Headings: 1.3
- Body / messages: 1.5
- Compact UI (labels, badges): 1.2

---

## 2. Spacing & Layout

### Current State

The app uses a sidebar + main panel layout with a fixed sidebar width of `260px`. Spacing values found across components:

**Padding values (px):** 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24
**Gap values (px):** 2, 3, 4, 5, 6, 8, 12, 16
**Margin values (px):** 2, 3, 4, 6, 8, 12, 14, 16, 20

### Issues

**No spacing scale.** Values are chosen freely per-component. The difference between `padding: 5` and `padding: 6`, or `gap: 5` and `gap: 6`, is imperceptible but creates maintenance burden and makes alignment accidents likely.

**Sidebar width is hardcoded at 260px.** This is reasonable for most desktop screens, but there is no resize handle and no collapse mechanism. On narrower displays (laptop at 1280px), the sidebar consumes 20% of horizontal space, which feels heavy.

**Horizontal padding is inconsistent across regions:**
- Sidebar header: `16px 12px`
- Sidebar card: `10px 12px`
- Main panel messages: `16px 20px`
- Context summary (top bar): `10px 20px`
- Prompt input: `12px 20px`
- Dialog body: `24px`

The main content area consistently uses `20px` horizontal padding, which is good. But the sidebar alternates between `8px` and `12px` depending on context.

**Vertical rhythm is inconsistent in card details.** The agent card uses `marginTop: 4` for the directory line and `marginTop: 3` for the status line — two different tiny values for two semantically similar gaps.

### Recommendations

**Adopt a 4px base grid.** Every spacing value should be a multiple of 4: `4, 8, 12, 16, 20, 24, 32, 40, 48`. Eliminate all odd values (3, 5, 14) and non-multiples (10 → 8 or 12).

Define tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Inline icon gaps, tight pill padding |
| `space-2` | 8px | Default gap between elements, card internal padding |
| `space-3` | 12px | Card padding, section gaps |
| `space-4` | 16px | Region padding, dialog sections |
| `space-5` | 20px | Main content area horizontal padding |
| `space-6` | 24px | Dialog padding |
| `space-8` | 32px | Large section breaks |

**Add a sidebar resize handle.** Allow users to drag the sidebar edge to resize between a minimum of 200px and a maximum of 360px. Persist the width in localStorage alongside the theme preference. Consider a collapse state (icon-only sidebar at ~48px) triggered by double-clicking the resize handle.

**Unify the card detail spacing.** Both the directory line and the status line beneath the card title should use the same `marginTop: 4px` (or a `gap: 4` in a flex column) to create a predictable vertical rhythm.

---

## 3. Button System

### Current State

The app has several button variants, none of which are extracted into a reusable component:

| Variant | Examples | Pattern |
|---------|----------|---------|
| Primary filled | "Create Agent", "Approve Plan", "Run", "Go to agent" | `background: accent, color: white, fontWeight: 600, borderRadius: 6, boxShadow: shadowChunky` |
| Secondary outline | "Cancel", "Close", "Request Changes" | `background: transparent, border: 1px solid borderColor, color: textSecondary` |
| Ghost (icon) | Pin, Copy, Archive, Delete, Theme toggle | `background: none, border: none, padding: 3px, color: textMuted` |
| Destructive | "Stop" | `background: peach, color: white` |
| Inline action | "Presets", Mode selector, "Environment variables" | `border: 1px solid borderColor, borderRadius: 5, fontSize: 11` |
| Header action | "Terminal", "Git", "Run" | `padding: 4px 10px, borderRadius: 6, fontSize: 11, fontWeight: 600` |

### Issues

**No shared button component.** Every button is styled inline, leading to subtle inconsistencies:
- Primary buttons use `padding: 8px 16px` in some dialogs and `6px 16px` in others (e.g., "Send Answer" vs "Create Agent")
- `borderRadius` alternates between `5` and `6` across similar buttons
- Some primary buttons have `fontFamily: theme.fontHeading` and some don't
- Some have `boxShadow: theme.shadowChunky` and some don't

**Disabled state is inconsistent.** The "Create Agent" button uses `background: theme.borderColor` + `cursor: not-allowed` when disabled. The "Git" header button uses `opacity: 0.5` + `cursor: not-allowed`. The prompt send button uses the same borderColor approach. Pick one pattern and use it everywhere.

**Hover states are missing on many buttons.** Primary filled buttons (Create Agent, Approve Plan, Send Answer) have no hover state at all — no background change, no transform, no opacity shift. This makes them feel static and unresponsive. The "New Agent" button is the one exception: it has a well-designed hover state with color inversion and scale transform.

**Click feedback is entirely absent.** No buttons have an `:active` or pressed state. Adding a subtle `scale(0.98)` or `translateY(1px)` on press would make the entire app feel more tactile.

**Ghost icon buttons have tiny hit targets.** The AgentCard hover buttons (Pin, Copy, Archive, Delete) are 12px icons with 3px padding, making each hit target roughly 18x18px. The recommended minimum touch/click target is 24x24px (Apple's HIG recommends 44x44pt for touch; for desktop, 24px is the practical minimum).

### Recommendations

**Create a `<Button>` component** with variants: `primary`, `secondary`, `ghost`, `danger`, `inline`. Each variant should define consistent padding, border-radius, font, hover, active, and disabled states.

**Standardize button sizing:**

| Size | Padding | Font | Min Height | Usage |
|------|---------|------|------------|-------|
| `sm` | `4px 8px` | 11px | 24px | Header actions, inline toggles |
| `md` | `6px 16px` | 13px | 32px | Dialog actions, toolbar buttons |
| `lg` | `8px 20px` | 14px | 36px | Primary CTAs in dialogs |

**Add hover and active states to all interactive buttons:**
- Primary: darken background 8% on hover, `scale(0.98)` on active
- Secondary: `background: theme.bgSurface` on hover, `scale(0.98)` on active
- Ghost: `background: theme.bgCard` on hover, `opacity: 0.7` on active

**Increase icon button hit targets** to a minimum of 28x28px (icon size 14-16px, padding 6-7px).

---

## 4. Input & Form Elements

### Current State

The app has three input types:
1. **Text inputs** — used in NewAgentDialog (name, directory) and SidebarFilters (search)
2. **Textareas** — used in PromptInput and RunDialog
3. **Select** — used in NewAgentDialog (permission mode)

### Issues

**Focus rings are suppressed globally.** `index.css` contains `textarea:focus, input:focus, select:focus { outline: none }` with no replacement. The border-color change on focus (`mauve → lavender`) is subtle — just a hue shift within the same value range. For keyboard users, this is effectively invisible.

**The select element is unstyled.** Native `<select>` elements look different across platforms and break the visual language. The dropdown arrow is system-default, the option list is unstyled, and it doesn't match the custom dropdowns used elsewhere (mode menu, presets menu, git menu).

**Input heights are inconsistent.**
- Dialog inputs: `padding: 8px 12px` with `fontSize: 14` → ~36px total height
- Search input: `padding: 5px 8px` with `fontSize: 12` → ~28px total height
- Env var inputs: `padding: 6px 10px` with `fontSize: 12` → ~30px total height

This inconsistency is jarring when a user flows between them.

**Placeholder text styling is not controlled.** The placeholder color defaults to the browser's choice, which may not match `theme.textMuted`. It should be explicitly styled.

**The rename input in AgentCard is visually jarring.** It appears with `padding: 1px 4px` and `borderRadius: 4`, which looks materially different from every other input in the app. Entering rename mode feels like a glitch rather than an intentional interaction.

**No character limit or validation feedback on inputs.** The agent name field accepts unlimited text with no visual guidance. The working directory field accepts any string with no path validation feedback until submission.

### Recommendations

**Replace the global `outline: none` with a themed focus style.** Use a 2px offset ring in the accent color:
```
box-shadow: 0 0 0 2px {theme.lavender}40;
border-color: {theme.lavender};
```
This provides clear keyboard focus indication while matching the visual language.

**Replace the native `<select>` with a custom dropdown** matching the existing mode/preset menu pattern. This ensures visual consistency across platforms.

**Standardize input sizing to two tiers:**

| Size | Padding | Font | Min Height | Usage |
|------|---------|------|------------|-------|
| `sm` | `6px 8px` | 12px | 28px | Sidebar search, env vars, inline inputs |
| `md` | `8px 12px` | 14px | 36px | Dialog fields, prompt input |

**Make the rename input match the card's existing visual space.** When entering rename mode, the input should appear to "replace" the text in-place with minimal visual disruption — same font size, same position, with only a subtle bottom-border or background change to indicate editability.

**Add placeholder color styling** in `index.css`:
```css
::placeholder { color: var(--text-muted); opacity: 0.7; }
```

---

## 5. Iconography

### Current State

All icons come from `lucide-react`. Icons used across the app:

| Icon | Sizes Used | Context |
|------|-----------|---------|
| Moon / Sun | 14px | Theme toggle |
| Pin | 10px, 12px | Card pin indicator / toggle |
| Folder / FolderOpen | 11px, 12px, 16px | Directory indicators, directory picker |
| Trash2 | 12px | Delete agent |
| Copy | 12px | Duplicate agent |
| Archive | 11px, 12px | Archive toggle |
| Search | 12px | Search field |
| Plus | 11px, 16px | New agent, add env var |
| Bot | 48px | Empty state illustration |
| Send | 16px | Send prompt |
| ChevronDown / ChevronRight | 9px, 10px, 12px | Expand/collapse, dropdowns |
| Wrench | 11px | Tool use indicator |
| User | 10px | User message avatar |
| Terminal / TerminalSquare | 11px, 12px | System init, terminal buttons |
| CheckCircle / AlertCircle | 12px | Result success/error |
| HelpCircle | 14px | Question from Claude |
| FileText | 14px | Plan review |
| Play / Square / Loader | 11px, 14px | Run/stop/loading |
| GitBranch | 11px | Git menu |
| Cpu | 12px | Model indicator |
| RotateCw | 12px | Turns counter |
| Bell | 14px | Notification |
| X | 12px, 14px, 18px | Close/dismiss |
| Settings | 10px | Presets menu |

### Issues

**Icon sizes are inconsistent for the same role.** The `Folder` icon appears at 11px (card), 12px (context summary), and 16px (dialog picker). `ChevronDown` appears at 9px, 10px, and 12px. This creates a subtle but perceptible unevenness.

**The 10px icon size is too small.** `User` at 10px, `Pin` at 10px, and `Settings` at 10px are at the limit of legibility, especially on non-Retina displays. They also make their parent hit targets feel cramped.

**The `Bot` empty state icon (48px) feels generic.** For a product with personality (the chunky shadows, the monospace headings), the empty state should reinforce the brand. A generic robot icon at 48px feels like a placeholder.

**`strokeWidth` is only set once (1.5 on the Bot icon).** Lucide's default is 2. At small sizes (10-12px), stroke width 2 makes icons look heavy and blobby. At large sizes (48px), it's fine. This means small icons are visually heavier than they should be relative to the text around them.

### Recommendations

**Establish icon size tiers tied to context:**

| Tier | Size | strokeWidth | Usage |
|------|------|-------------|-------|
| Inline | 14px | 1.5 | Icons next to body text (status, labels) |
| Button | 16px | 1.5 | Icons inside buttons |
| Header | 18px | 1.5 | Dialog close buttons, section icons |
| Display | 32-48px | 1.25 | Empty states, illustrations |

Eliminate the 9-12px icon sizes. The minimum icon size should be 14px for legibility and hit target size.

**Use `strokeWidth={1.5}` globally for all icons.** Add this as a default at the provider level or through a wrapper component. This makes small icons crisper and avoids the "too thick" look at 14-16px sizes.

**Consider a custom illustration for the empty state** instead of the generic `Bot` icon. Even a simple SVG illustration of the app's concept (multiple terminal windows, connected agents) would convey more about what the product does and feel more polished.

---

## 6. Shadows & Elevation

### Current State

Two shadow tokens exist:
- `shadowChunky: "2px 3px 0 #acb0be"` (light) / `"2px 3px 0 rgba(0,0,0,0.5)"` (dark)
- `shadowDialog: "4px 6px 0 rgba(114,135,253,0.25)"` (light) / `"4px 6px 0 rgba(0,0,0,0.6)"` (dark)

### Issues

**The "chunky shadow" is a strong design opinion.** Hard-offset shadows with zero blur give the app a neo-brutalist or retro-pixel aesthetic. This is a deliberate design choice and works well for personality, but it's used inconsistently:
- Selected agent card: has `shadowChunky`
- Primary buttons in dialogs: some have it, some don't
- Notification "Go to agent" button: has it
- Mode selector button: doesn't have it
- Filter buttons: don't have it

**There is no intermediate elevation level.** The app has "flat" (no shadow) and "chunky" (strong shadow), with nothing in between. Dropdown menus use `shadowDialog`, but there's no subtle shadow for cards, panels, or hover states.

**The dialog overlay color is hardcoded.** `"rgba(74, 74, 74, 0.4)"` doesn't adapt to the theme. In dark mode, this creates a lighter-than-expected scrim that feels out of place against the deep Mocha background.

### Recommendations

**Define three elevation levels:**

| Level | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `elevation-1` | `0 1px 3px rgba(0,0,0,0.08)` | `0 1px 3px rgba(0,0,0,0.3)` | Cards, sidebar, subtle lifts |
| `elevation-2` | `2px 3px 0 {shadowColor}` | `2px 3px 0 rgba(0,0,0,0.5)` | Selected states, primary buttons (the chunky shadow) |
| `elevation-3` | `4px 6px 0 {shadowColor}` | `4px 6px 12px rgba(0,0,0,0.6)` | Dialogs, popovers |

**Be consistent with where `shadowChunky` appears.** If it's the signature of an interactive element, apply it to all primary buttons when enabled. If it's the signature of a selected state, only apply it to selected items. Currently it's both, which dilutes its meaning.

**Theme the dialog overlay:**
- Light: `rgba(76, 79, 105, 0.35)` (Latte Text at 35% — dark enough to dim, warm enough to match)
- Dark: `rgba(0, 0, 0, 0.55)` (deeper overlay for the dark background)

---

## 7. Border Radius

### Current State

Border radius values used across the app:

| Value | Usage |
|-------|-------|
| `3px` | Scrollbar thumb |
| `4px` | Icon buttons, rename input, small controls |
| `5px` | Filter buttons, dropdown items, inline action buttons |
| `6px` | Primary/secondary buttons, inputs, result badges, option buttons |
| `8px` | Agent cards, tool use blocks, dropdown menus, "New Agent" button |
| `10px` | Prompt input wrapper, count badges |
| `12px` | Dialog containers, attention badge pill |
| `50%` | Status dots, mode indicator dots |

### Issues

**Seven distinct radius values is too many.** The visual difference between `4px`, `5px`, and `6px` is invisible at screen distance. Between `8px` and `10px` it's barely perceptible. This suggests the values were chosen per-component rather than from a system.

### Recommendations

**Consolidate to three radius tokens:**

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Small controls, badges, scrollbar |
| `radius-md` | 8px | Buttons, inputs, cards, dropdowns |
| `radius-lg` | 12px | Dialogs, modals, large containers |
| `radius-full` | 9999px | Pills, dots, circular elements |

Map every current usage to the nearest token. The app should feel like it has one "roundness personality," not seven.

---

## 8. Color Usage (Non-Palette)

### Issues

The Catppuccin palette is well-applied for backgrounds, text, and accents. However, several **hardcoded colors** exist outside the theme system:

| Color | Where | Issue |
|-------|-------|-------|
| `#C8A951` | Plan mode accent, Claude CLI button, stopped command | Not a Catppuccin color. Consider using `theme.butter` (#df8e1d Latte / #f9e2af Mocha) instead, or add it as a theme token |
| `rgba(196, 181, 212, 0.1)` | AgentCard hover background | A leftover from the pre-Catppuccin palette. Should use a Catppuccin-derived value like `{theme.lavender}15` |
| `rgba(180, 180, 180, 0.1)` | Terminal button background | A gray that doesn't correspond to any Catppuccin surface color |
| `rgba(74, 74, 74, 0.4)` | Dialog overlay | Not adapted to light/dark themes |
| `#B8B8B8` | Fallback status color | Should be Overlay1 or a defined fallback in the theme |
| `white` | Button text, "white" hardcoded | Should be a theme token (e.g., Latte Base `#eff1f5` in dark mode, Mocha Crust `#11111b` for contrast text) |

### Recommendations

**Add a `textOnAccent` token** to the theme for text rendered on top of accent-colored backgrounds. In the Catppuccin system, this would be `Crust` (#dce0e8 for Latte, #11111b for Mocha) or simply `Base` for dark-on-light and `Crust` for light-on-dark.

**Migrate all hardcoded colors to theme tokens.** The `#C8A951` plan mode color deserves its own semantic token (e.g., `plan` or `gold`) if `theme.butter` doesn't feel right. But it must adapt across themes.

**Replace `rgba(196, 181, 212, 0.1)` with `{theme.lavender}15`** (hex opacity suffix). This ensures the hover tint derives from the actual theme's lavender.

---

## 9. Interaction Design

### Hover States

**Good:**
- Agent card: scale(1.02) + background change on hover. This is playful and communicates interactivity.
- New Agent button: color inversion on hover. This is well-done and satisfying.
- Icon buttons: color change from muted to semantic color. Clear and functional.

**Needs work:**
- Primary filled buttons have NO hover state. "Create Agent", "Approve Plan", "Send Answer", "Run" — none of them visually respond to hover. This makes them feel inert.
- Dropdown menu items change background via imperative `onMouseEnter`/`onMouseLeave` style manipulation. This works but is fragile and doesn't handle edge cases (e.g., mouse leaving the window while hovering).
- The send button (prompt input) has no hover state. The color-to-gray disabled transition is good, but the enabled state should brighten or scale on hover.

### Focus Management

**Good:**
- Dialog auto-focuses the first input on mount
- Rename input auto-focuses and selects text on activation
- Prompt textarea auto-focuses when agent changes

**Needs work:**
- No visible focus ring on any element (global `outline: none` with no replacement)
- Tab order through the sidebar filter buttons, agent cards, and toolbar buttons is not managed
- Dropdown menus have no keyboard navigation (no arrow key support, no Escape-to-close on focus loss)
- The dialog doesn't trap focus — Tab can move focus behind the overlay

### Keyboard Shortcuts

**Current:**
- `Cmd+N` — New agent dialog
- `Cmd+1-9` — Select agent by position
- `Cmd+Enter` — Send prompt
- `Ctrl+Enter` — Send prompt (alternative)
- `Shift+Tab` — Cycle prompt mode
- `Escape` — Close dialog (when focused)
- `Enter` — Commit rename

**Missing but expected for a power-user tool:**
- `Cmd+K` or `/` — Focus search/command palette
- `Cmd+W` — Close/archive current agent
- `Cmd+Shift+N` — Duplicate current agent
- Arrow keys — Navigate agent list
- `Escape` — Deselect agent / close sidebar dropdown
- `Cmd+.` — Stop running command
- `Cmd+Shift+T` — Toggle theme

### Recommendations

**Add visible focus indicators on all interactive elements.** A `2px` ring in `theme.lavender` at 40% opacity provides visibility without visual noise.

**Implement focus trapping in modals.** When a dialog is open, Tab should cycle through the dialog's focusable elements and not escape to the content behind the overlay. Libraries like `focus-trap-react` handle this cleanly, or it can be implemented manually.

**Add keyboard navigation to dropdown menus.** Arrow Up/Down should move through items, Enter should select, and Escape should close the menu and return focus to the trigger button.

**Expand the keyboard shortcut set** for the power-user audience this tool targets. Consider a `Cmd+K` command palette as a future feature — it's become table-stakes for developer tools.

---

## 10. Motion & Animation

### Current State

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `springIn` | 0.25s | ease-out | Dialog entrance |
| `slideDown` | 0.2s | ease-out | Notification banner |
| `pulse` | 1.5s / 2s | linear (implicit) | Attention / working status |
| `spin` | 1s | linear | Loading spinner |
| Spring transitions | 0.2s | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Card hover, button transitions |
| Color transitions | 0.15-0.3s | ease | Border, background, color changes |

### Issues

**No exit animations.** Dialogs spring in but disappear instantly. The notification banner slides down but snaps away. This asymmetry feels abrupt. "Closing" something should be at least half as long as opening it (125ms fade-out for a 250ms entrance).

**The spring easing overshoots aggressively.** `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoots by ~56%, which is very bouncy. This is fine for a "New Agent" button hover but feels excessive on every card transition in the sidebar. A softer spring like `cubic-bezier(0.22, 1.0, 0.36, 1)` (Material's "emphasized decelerate") would be more appropriate for frequent interactions.

**The `pulse` animation is distracting for working status.** A continuously pulsing status dot at 2s intervals creates persistent peripheral motion, which can be distracting during focus work. Consider:
- Using a single subtle pulse on status change (draw attention once) and then returning to a static glow
- Or reducing the opacity range (e.g., 0.8 to 1.0 instead of 0.5 to 1.0)

**The `attentionPulse` animation is defined in CSS but the JS implementation uses the simpler `pulse` animation for attention states.** The `attentionPulse` keyframe (which pulses box-shadow) is never referenced. Either use it or remove the dead CSS.

### Recommendations

**Add exit animations to all overlays.** A 150ms `opacity: 1 → 0` + `scale(1) → scale(0.97)` for dialogs. A 150ms `opacity: 1 → 0` + `translateY(0) → translateY(-4px)` for notifications. This requires tracking an "exiting" state before unmounting.

**Provide a `prefers-reduced-motion` media query handler.** Some users (and some operating systems) prefer minimal motion. When this is set, skip all scale transforms, replace spring easing with `ease`, and disable the pulse animation. This is a significant accessibility improvement.

**Calibrate the spring tension per context:**
- Micro-interactions (button hover, icon color): `cubic-bezier(0.22, 1.0, 0.36, 1)`, 150ms
- Macro-interactions (card selection, panel transitions): `cubic-bezier(0.34, 1.2, 0.64, 1)`, 200ms
- Entrances (dialog, dropdown): `cubic-bezier(0.34, 1.4, 0.64, 1)`, 250ms

---

## 11. Accessibility

### Current State

The app has **minimal** accessibility support:

**What exists:**
- `title` attributes on icon buttons (Pin, Copy, Archive, Delete, header buttons)
- `disabled` attribute on form elements when appropriate
- Semantic HTML used in places (h2 for dialog titles, label elements for form fields)
- `lang="en"` on the HTML element

**What's missing:**
- No `aria-label` on any icon-only button
- No `role="dialog"` or `aria-modal="true"` on dialog overlays
- No `aria-expanded` on dropdown triggers
- No `aria-selected` or `role="option"` in the agent list
- No `role="listbox"` or `role="list"` on the sidebar agent container
- No skip navigation links
- No live regions (`aria-live`) for status changes or notifications
- No focus trapping in modals
- No visible focus indicators
- No `prefers-reduced-motion` support
- No `prefers-color-scheme` integration (theme is manually toggled)
- Color contrast has not been systematically verified against WCAG AA standards

### Recommendations (Prioritized)

**P0 — Focus visibility:** Replace `outline: none` with themed focus rings. This single change has the highest impact-to-effort ratio for keyboard users.

**P0 — Dialog accessibility:** Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (pointing to the title), and focus trapping to both `NewAgentDialog` and `RunDialog`.

**P1 — ARIA on interactive patterns:**
- Dropdown menus: `aria-expanded`, `aria-haspopup="true"`, `role="menu"`, `role="menuitem"`
- Agent list: `role="listbox"`, `role="option"`, `aria-selected`
- Notification banner: `role="alert"`, `aria-live="polite"`

**P1 — `aria-label` on icon-only buttons.** Every button that contains only an icon needs an accessible name. `title` is insufficient — it's a tooltip, not a screen reader label.

**P2 — `prefers-reduced-motion` support.** Wrap all animations in a media query check.

**P2 — `prefers-color-scheme` auto-detection.** Default to the system theme on first load, then allow manual override.

**P3 — Color contrast audit.** Run the Catppuccin palette through a contrast checker. Catppuccin is generally well-tested, but the computed tint colors (lavenderLight, mintLight, etc.) should be verified against text colors placed on top of them.

---

## 12. Component Architecture

### Current State

All styling is done via inline React `style` objects with theme values interpolated from the Zustand store. There are no shared UI components — every button, input, dropdown, and card is styled from scratch in its component file.

### Issues

**Inline styles make systematic changes expensive.** Changing the border-radius from 6 to 8 across all buttons requires editing dozens of individual `style` objects across multiple files. With extracted components, it would be a one-line change.

**Hover/active states are managed imperatively.** `onMouseEnter`/`onMouseLeave` handlers that mutate `e.currentTarget.style` are brittle — they don't handle edge cases (mouse leaving the browser, fast moves between elements) and they can't be expressed in terms of CSS pseudo-classes.

**No style composition pattern.** When two components need similar styling (e.g., the "Cancel" button in NewAgentDialog vs RunDialog), the styles are duplicated. There's no spreading from a shared style object.

### Recommendations

**Extract a small set of primitive UI components.** This is the single highest-leverage change for long-term maintainability:

1. `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg" />`
2. `<Input size="sm|md" />`
3. `<IconButton icon={Component} label="..." />`
4. `<Dropdown trigger={...} items={...} />`
5. `<Dialog title="..." onClose={...} />`
6. `<Badge color="..." />`

Each primitive owns its own styling, hover/active/disabled/focus states, ARIA attributes, and animation. Components consuming them pass only semantic props (`variant`, `size`, `disabled`), not style objects.

**Consider migrating inline styles to CSS Modules or a utility-first approach.** Inline styles can't express pseudo-classes (`:hover`, `:focus`, `:active`, `::placeholder`), media queries (`prefers-reduced-motion`, `prefers-color-scheme`), or animations without JavaScript workarounds. CSS Modules with CSS custom properties derived from the theme would give you both type-safe theme tokens and full CSS capability.

---

## 13. Information Architecture & UX Patterns

### Sidebar

**The sidebar serves triple duty:** navigation (agent list), status display (attention badges), and actions (new agent, archive). This is appropriate for the current scope but will not scale beyond ~20 agents. Consider:
- **Agent grouping** by project directory, status, or manual folders
- **Collapsed card mode** showing only the status dot and name (no directory/status line) to fit more agents on screen
- **Virtual scrolling** for agent lists exceeding ~50 items

**The archive toggle is easy to miss.** It's an 11px text link at the bottom of the agent list. If archiving is a core workflow, it deserves a more prominent presence — a segmented control at the top (Active / Archived) or a filter chip.

### Main Panel

**The context summary bar is dense.** Agent name, status, directory, turns, model, and four action buttons compete for space in a single 40px-tall bar. On narrower windows, `flexWrap: wrap` causes it to collapse unpredictably. Consider:
- Moving agent meta (turns, model) into a secondary line or a hover tooltip
- Grouping action buttons into a single "more" overflow menu with the most common action (Run) staying visible

**Messages have no timestamps.** In a long conversation, there's no way to know when a message was sent. Even a relative timestamp ("2m ago") on hover would help users orient themselves.

**Tool use blocks are visually repetitive.** A long sequence of Read/Edit/Bash tool calls all look the same — lavender rectangles with wrench icons. Differentiating tool types by icon (file icon for Read, pencil for Edit, terminal for Bash) would make scanning much faster.

### Empty States

**The empty state is adequate but not helpful.** "Select an agent or create one" with a keyboard hint is functional. Consider making this state more actionable:
- Show a "Create your first agent" CTA button directly in the empty state
- If agents exist but none are selected, show a brief preview of all agent statuses (like a dashboard view)

### Notifications

**The notification banner is non-dismissible.** Once an agent needs attention, the banner stays until the user navigates to that agent. There should be a dismiss/snooze mechanism for cases where the user is aware but busy with another agent.

---

## 14. Platform Considerations (Tauri)

**The window drag region is limited to the sidebar header.** This is a very small target area. Consider extending the drag region to include more of the top bar or adding a dedicated title bar region.

**No native menu bar integration.** Tauri supports native application menus. Adding a File menu (New Agent, Preferences) and Edit menu (standard cut/copy/paste) would make the app feel more native on macOS and Windows.

**No window state persistence.** The app should remember its window size and position between sessions.

**Custom favicon is not set.** The app still uses the default Vite SVG (`/vite.svg`). This should be replaced with a branded icon.

---

## 15. Prioritized Recommendations Summary

### Tier 1 — High Impact, Ship-Blocking

| # | Recommendation | Effort |
|---|---------------|--------|
| 1 | Add visible focus indicators (replace global outline: none) | Low |
| 2 | Add hover/active states to all primary and secondary buttons | Low |
| 3 | Theme the dialog overlay color (light/dark adaptive) | Low |
| 4 | Migrate hardcoded colors (#C8A951, rgba hover values) to theme tokens | Low |
| 5 | Increase icon button hit targets to minimum 28x28px | Low |
| 6 | Add `role="dialog"`, `aria-modal`, and focus trapping to dialogs | Medium |

### Tier 2 — Professional Polish

| # | Recommendation | Effort |
|---|---------------|--------|
| 7 | Define and enforce a type scale (6 sizes, 4 weights) | Medium |
| 8 | Adopt a 4px spacing grid system | Medium |
| 9 | Consolidate border-radius to 3 tokens | Low |
| 10 | Add exit animations to dialogs and notifications | Medium |
| 11 | Extract shared Button, Input, IconButton, Dialog primitives | High |
| 12 | Replace native `<select>` with a custom themed dropdown | Medium |
| 13 | Support `prefers-reduced-motion` | Low |
| 14 | Support `prefers-color-scheme` for automatic theme detection | Low |
| 15 | Use differentiated icons per tool type in message stream | Low |

### Tier 3 — Scaling & Delight

| # | Recommendation | Effort |
|---|---------------|--------|
| 16 | Add sidebar resize handle with min/max bounds | Medium |
| 17 | Add keyboard navigation to all dropdown menus | Medium |
| 18 | Expand keyboard shortcuts (Cmd+K palette, arrow nav, Cmd+W) | High |
| 19 | Add timestamps (or relative time) to messages | Low |
| 20 | Add message grouping / collapsible turn boundaries | Medium |
| 21 | Notification dismiss/snooze mechanism | Low |
| 22 | Custom empty state illustration | Low |
| 23 | Window state persistence (size, position) | Low |
| 24 | Native Tauri menu bar integration | Medium |
| 25 | Replace Vite favicon with branded app icon | Low |

---

## Appendix A: Design Token Reference (Proposed)

Below is a proposed design token system that consolidates the current ad-hoc values into a maintainable structure. This is not prescriptive about implementation (CSS variables, TS constants, or a tokens JSON file would all work) — it's about establishing the vocabulary.

```
typography:
  family:
    heading: "Space Mono, monospace"
    body: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    code: "JetBrains Mono, monospace"
  size:
    xs: 10px
    sm: 12px
    base: 14px
    lg: 16px
    xl: 18px
    2xl: 22px
  weight:
    regular: 400
    medium: 500
    semibold: 600
    bold: 700
  lineHeight:
    tight: 1.2
    normal: 1.5
    relaxed: 1.6

spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px

radius:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px

elevation:
  1: "0 1px 3px rgba(0,0,0,0.08)"     # cards, subtle lift
  2: "2px 3px 0 {shadow-color}"        # chunky (selected, primary)
  3: "4px 6px 0 {shadow-color}"        # dialogs, popovers

motion:
  duration:
    instant: 100ms
    fast: 150ms
    normal: 200ms
    entrance: 250ms
  easing:
    micro: "cubic-bezier(0.22, 1.0, 0.36, 1)"
    macro: "cubic-bezier(0.34, 1.2, 0.64, 1)"
    entrance: "cubic-bezier(0.34, 1.4, 0.64, 1)"
    exit: "cubic-bezier(0.4, 0, 1, 1)"

icon:
  size:
    sm: 14px
    md: 16px
    lg: 18px
    display: 32px
  strokeWidth: 1.5
```

---

## Appendix B: Contrast Ratios to Verify

These are the text-on-background combinations that should be checked against WCAG AA (4.5:1 for normal text, 3:1 for large text):

| Text | Background | Context |
|------|-----------|---------|
| `textPrimary` on `bgBase` | Primary reading | Should pass easily |
| `textSecondary` on `bgBase` | Secondary labels | Verify |
| `textMuted` on `bgBase` | Muted text / placeholders | May fall below 4.5:1 — acceptable for decorative text, not for functional labels |
| `textPrimary` on `lavenderLight` | Selected card, question blocks | Verify |
| `textPrimary` on `mintLight` | Plan review, success results | Verify |
| `textPrimary` on `peachLight` | Error results, error messages | Verify |
| `white` on `lavender` | Primary button text | Verify (Latte lavender #7287fd may need white vs Crust) |
| `white` on `mint` | Approve/Run button text | Verify (Latte green #40a02b should pass) |
| `white` on `peach` | Stop/error button text | Verify (Latte peach #fe640b is vivid — check) |

---

*This analysis is based on a static code review of every component file, style object, and interaction handler in the CC-Manager codebase as of February 2026. Recommendations are ordered by impact and are intended to be implemented incrementally — the app is functional and usable today, and each tier of improvements adds a measurable layer of polish.*
