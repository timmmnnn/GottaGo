# Rubbish.day Visual Design Guide

Use this guide to recreate the visual language of `rubbish.day` on another website. It describes the shipped UI as a reusable brand and interface system, not the backend behavior.

## Design Thesis

`rubbish.day` should feel like a fast, modern public utility wrapped in a polished consumer-grade interface. The look is dark, glassy, calm, and search-first. It uses a near-black canvas, soft blurred color fields, translucent panels, crisp type, and a bright mint-green action color.

The brand personality is:

- Immediate: the first screen is the working tool, not a marketing page.
- Trustworthy: labels are plain, hierarchy is obvious, and data surfaces in compact cards.
- Lightly futuristic: glass, glow, animated borders, and subtle shimmer are used as atmosphere.
- Civic-friendly: the UI remains practical, readable, and accessible despite the visual polish.

Avoid making the design feel like a generic SaaS dashboard, a marketing landing page, or a playful cartoon app. It should feel like a useful civic lookup tool with a little magic in the surface treatment.

## Core Visual Tokens

### Canvas

Default to dark mode.

```css
:root {
  --content-max: 860px;
  --page-gutter: 1.5rem;
  --status-max: 38rem;

  --page-bg: #07070f;
  --ink: #ffffff;
  --ink-muted: rgba(255,255,255,0.5);
  --ink-subtle: rgba(255,255,255,0.25);

  --accent: #07B98A;
  --accent-glow: rgba(7,185,138,0.4);
  --accent-dim: rgba(7,185,138,0.12);

  --glass-bg: rgba(255,255,255,0.07);
  --glass-border: rgba(255,255,255,0.10);
  --glass-shine: rgba(255,255,255,0.18);

  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Accent Palette

Primary accent:

- Mint: `#07B98A`
- Mint hover/glow: `rgba(7,185,138,0.35)` to `rgba(7,185,138,0.55)`
- Pale mint highlight: `#8af2cf`
- Logo highlight: `#34d3a8`, `#a5f3dc`

Supporting atmospheric colors:

- Violet haze: `rgba(99,102,241,0.18)`
- Pink haze: `rgba(236,72,153,0.10)`
- Warm warning/food: `#e8923a`, `rgba(232,146,58,0.20)`
- Blue/glass stream: `#60a5fa`
- Neutral rubbish/slate: `#94a3b8`
- Urgent red: `#ef4444`
- Tomorrow orange: `#f97316`

Use mint as the only dominant brand color. Supporting colors should mostly appear in gradients, category tints, status dots, and subtle backgrounds.

### Light Theme

Light mode is warm, not stark white.

```css
[data-theme="light"] {
  --page-bg: #f6f1e8;
  --ink: #18322d;
  --ink-muted: rgba(24,50,45,0.58);
  --ink-subtle: rgba(24,50,45,0.38);
  --accent: #0f8f7b;
  --glass-bg: rgba(255,255,255,0.65);
  --glass-border: rgba(0,0,0,0.09);
  --glass-shine: rgba(255,255,255,0.95);
}
```

Light mode surfaces should feel like warm translucent paper over a soft cream background:

- Body: `#f6f1e8`
- Main glass panels: `rgba(255,251,245,0.76)`
- Toggle/select surfaces: `rgba(255,249,241,0.64)` to `rgba(255,249,241,0.82)`
- Light accent: `#0f8f7b`
- Light logo gradient: `#0b6fa4 -> #14948d -> #5cb8a6`

## Typography

Use native system UI fonts for almost everything.

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

Use a monospace stack only for structured data such as addresses, dates, countdowns, IDs, and user-entered lookup values.

```css
font-family: ui-monospace, "SFMono-Regular", "Cascadia Mono", "Segoe UI Mono", monospace;
```

Type scale:

- Hero brand/title: `clamp(3.25rem, 8.5vw, 5.25rem)`, weight `500`, line-height `1.05`.
- Hero supporting copy: `1.0625rem`, line-height `1.65`, max-width around `460px`.
- Form input: `1rem`, monospace, normal letter spacing.
- Primary button: `0.8125rem`, weight `700`, uppercase, letter spacing `0.1em`.
- Pills and source chips: `0.5625rem` to `0.75rem`, uppercase only for metadata/status.
- Result card label: `0.6875rem`, uppercase, letter spacing `0.1em` to `0.12em`.
- Result date/value: `1.125rem`, weight `600`, monospace.

Do not overuse all-caps. Reserve it for chips, labels, and primary actions. Body copy stays sentence case.

## Page Structure

The first screen should be the product.

Recommended desktop structure:

1. Fixed atmospheric background.
2. Small floating circular theme toggle in the top-right.
3. Hero block aligned low in the first viewport.
4. Large brand/title, usually with the brand word in the accent gradient.
5. Short supporting sentence.
6. Main glass search/action card directly below.
7. Result/status region below the search card.
8. Minimal footer.

Layout rules:

- Constrain main content to `860px`.
- Use `1.5rem` page gutters on desktop.
- Hero min-height is around `43vh`, aligned to the bottom.
- The search card should be the focal object and should sit above the fold.
- Do not build a large marketing hero with a separate card beside it.
- Do not put cards inside cards unless it is a real repeated data item.

## Background Treatment

The dark canvas uses three blurred radial blobs plus a subtle cursor glow.

```css
body { background: #07070f; color: #fff; }

.bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(130px);
}

.blob-1 {
  width: 900px;
  height: 900px;
  top: -320px;
  right: -250px;
  background: radial-gradient(circle, rgba(7,185,138,0.22) 0%, transparent 60%);
}

.blob-2 {
  width: 750px;
  height: 750px;
  bottom: -180px;
  left: -250px;
  background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 60%);
}

.blob-3 {
  width: 500px;
  height: 500px;
  top: 45%;
  left: 35%;
  background: radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 60%);
}
```

Motion:

- Let blobs drift slowly over `13s` to `20s`.
- Cursor glow follows pointer on pointer-capable devices only.
- Disable background/cursor visual effects on small mobile screens.
- Respect `prefers-reduced-motion`.

Do not add grain, bokeh, star fields, heavy gradients, or decorative SVG wallpaper. The surface should feel liquid and quiet.

## Brand Mark And Hero Title

The brand word is rendered as text, not an image.

```css
.hero h1 {
  font-size: clamp(3.25rem, 8.5vw, 5.25rem);
  font-weight: 500;
  letter-spacing: -0.035em;
  line-height: 1.05;
}

.hero h1 span {
  background: linear-gradient(135deg, #07B98A 0%, #34d3a8 50%, #a5f3dc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow:
    0 0 8px rgba(7,185,138,0.26),
    0 0 18px rgba(52,211,168,0.16),
    0 0 34px rgba(165,243,220,0.1);
}
```

Hero links can have a soft aura and a gentle sweep, but keep this effect reserved for the brand/title. Do not apply the same shimmer to every heading.

## Glass Surface System

The signature surface is translucent glass over the dark canvas.

Primary card:

```css
.search-card {
  border-radius: 22px;
  padding: 1.65rem 1.85rem;
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(56px) saturate(200%) brightness(1.08);
  -webkit-backdrop-filter: blur(56px) saturate(200%) brightness(1.08);
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,0.22),
    inset 0 -1px 0 rgba(0,0,0,0.15),
    0 32px 80px rgba(0,0,0,0.45);
}
```

Primary card animated border:

```css
.search-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: 23px;
  padding: 1px;
  background: conic-gradient(
    from var(--angle),
    rgba(7,185,138,0.7),
    rgba(99,102,241,0.5),
    rgba(236,72,153,0.4),
    rgba(7,185,138,0.1),
    rgba(7,185,138,0.7)
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
```

Repeated result cards:

- Radius: `14px` to `16px`.
- Padding: `1.25rem 1.35rem` compact, `1.5rem 1.75rem` spacious.
- Border: `1px solid rgba(255,255,255,0.09)`.
- Background: category-tinted transparent glass.
- Shadow: lower than the main search card, around `0 8px 32px rgba(0,0,0,0.25)`.
- Add a one-pixel top shine line.
- Optional hover shimmer sweep on desktop only.

## Buttons And Controls

### Primary Action Button

Use a pill shape and mint outline/tint.

```css
.primary-action {
  min-height: 3rem;
  min-width: 8.75rem;
  padding: 0.875rem 1.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(7,185,138,0.35);
  background: rgba(7,185,138,0.12);
  color: #07B98A;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.primary-action:hover {
  background: rgba(7,185,138,0.20);
  border-color: rgba(7,185,138,0.55);
  box-shadow: 0 0 24px rgba(7,185,138,0.35), 0 4px 16px rgba(0,0,0,0.3);
}
```

Use a soft sheen sweep on important buttons. Keep less important buttons matte.

### Segmented Selectors

Desktop segmented controls are wrapped in a translucent rounded rectangle.

```css
.segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.4rem;
  border-radius: 16px;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.075);
}

.segment {
  min-height: 2rem;
  padding: 0.48rem 0.82rem;
  border-radius: 12px;
  color: rgba(255,255,255,0.52);
  font-size: 0.72rem;
  font-weight: 600;
}

.segment.active {
  background: #07B98A;
  color: #fff;
  box-shadow: 0 8px 22px rgba(7,185,138,0.18);
}
```

On mobile, replace large segmented groups with a full-width native select styled as glass.

### Inputs

Inputs should be direct and data-like.

```css
.text-input {
  min-height: 3rem;
  padding: 0.875rem 2.5rem 0.875rem 1rem;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.13);
  background: rgba(255,255,255,0.075);
  color: #fff;
  font-size: 1rem;
  font-family: ui-monospace, "SFMono-Regular", "Cascadia Mono", "Segoe UI Mono", monospace;
}

.text-input:focus {
  border-color: rgba(7,185,138,0.55);
  box-shadow: 0 0 0 3px rgba(7,185,138,0.12), inset 0 1px 0 rgba(255,255,255,0.08);
}
```

Place clear buttons inside the input on the right as small circular controls.

## Data And Result Cards

Result cards should be compact, scannable, and category coded.

Card anatomy:

1. Icon block, `2.5rem` to `2.75rem`.
2. Uppercase metadata label.
3. Monospace value/date.
4. Optional supporting note in low-contrast text.
5. Optional urgency pill.

Category treatments:

```css
.card.rubbish { background: rgba(255,255,255,0.06); }
.card.recycle { background: rgba(7,185,138,0.09); border-color: rgba(7,185,138,0.20); }
.card.food    { background: rgba(232,146,58,0.09); border-color: rgba(232,146,58,0.20); }
.card.garden  { background: rgba(72,187,120,0.09); border-color: rgba(72,187,120,0.20); }
.card.bulk    { background: rgba(148,163,184,0.08); border-color: rgba(148,163,184,0.18); }
.card.na      { background: rgba(255,255,255,0.03); opacity: 0.5; }
```

Urgency:

- Today: red accent border/glow, use sparingly.
- Tomorrow: orange accent border.
- Soon: mint indicator.
- Normal: no urgency badge.

## Spacing And Radius

Recommended spacing scale:

- `0.35rem`: tight gaps inside chips.
- `0.55rem` to `0.75rem`: control groups and shortcut gaps.
- `0.875rem` to `1rem`: input padding and mobile card padding.
- `1.25rem` to `1.5rem`: result card padding.
- `1.65rem` to `1.85rem`: primary search card desktop padding.
- `2rem` to `3.25rem`: section and hero vertical rhythm.

Radius:

- Input: `9px`.
- Small chip/card: `10px` to `12px`.
- Result card: `14px` to `16px`.
- Primary glass card: `22px`.
- Pills and circular controls: `9999px`.

## Motion Rules

Motion is ambient and supportive, never required for comprehension.

Use:

- Slow background drift: `13s` to `20s`.
- Logo aura/shimmer: `5s` to `8s`.
- Primary card border spin: `6s linear`.
- Button hover sheen: `0.5s`.
- Card entrance: `0.45s var(--ease-out)`, from `translateY(16px)` and opacity `0`.
- Hover lift: `translateY(-1px)` for small controls only.
- Active press: `scale(0.95)` for primary action buttons.

Disable or reduce:

- Animated background on mobile.
- Conic border animation on mobile.
- Any non-essential animation when `prefers-reduced-motion: reduce`.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Responsive Behavior

Mobile breakpoint: `640px`.

Mobile rules:

- Hide fixed animated background and cursor glow.
- Keep the main glass search card but reduce blur from `56px` to about `18px`.
- Search card padding becomes `1.2rem 1rem 1.1rem`.
- Replace segmented controls with a native full-width select.
- Stack input and primary action vertically.
- Make the primary action full width with min-height around `3.15rem`.
- Use one-column result cards.
- Keep result content left aligned.
- Use compact cards and avoid decorative animation.

Do not scale font sizes with viewport width except the hero title clamp. Mobile should feel like the same product, just calmer and more direct.

## Accessibility And Interaction

Required behavior:

- Include a first-tab skip link.
- Keep `main` focusable where needed.
- Use visible focus styles: `2px solid rgba(165,243,220,0.95)` with `3px` offset.
- Use polite live regions for changing source/status metadata.
- Use real buttons for actions and real selects for mobile source/city choice.
- Preserve sufficient contrast in both themes.
- Do not rely on color alone for result categories; pair color with labels and icons.
- Avoid focus traps and hidden animated content that remains keyboard reachable.

Skip link style:

```css
.skip-link:focus-visible {
  padding: 0.8rem 1rem;
  border-radius: 999px;
  background: rgba(7,185,138,0.96);
  color: #05251d;
  outline: 2px solid #fff;
  outline-offset: 3px;
}
```

## Copy And Content Style

Voice:

- Short, practical, plain English.
- Direct verbs: "Find", "Choose", "Search", "Use my location".
- Trust-building notes should be specific, not promotional.
- Avoid decorative marketing slogans.

Good examples:

- "Find your next rubbish, recycling and food scraps collection dates for your address."
- "Rubbish.day proxies live lookups to the official council or provider system for the city you choose."
- "Start typing your address..."

Avoid:

- "Experience the future of waste management."
- "Unlock effortless civic intelligence."
- Long explanatory helper text inside the first viewport.

## Implementation Checklist For Another Site

Build the UI using these exact principles:

- Dark-first system UI interface on `#07070f`.
- One bright mint accent: `#07B98A`.
- Main content max width: `860px`.
- First viewport is functional: title, short copy, primary tool/search card.
- Primary card uses translucent glass, `22px` radius, deep shadow, optional animated conic border.
- Inputs are monospace, compact, and glassy.
- Primary action is an uppercase mint pill.
- Result/data cards are translucent, compact, category tinted, and scannable.
- Ambient background uses blurred radial blobs, not illustrated shapes.
- Mobile removes decorative animation and switches dense selectors to native selects.
- Light theme is warm cream with teal accents, not pure white.
- Accessibility is part of the visual system: visible focus, skip link, clear labels, reduced motion.

## Agent Build Prompt

Use this prompt when asking another AI agent to build a site in this style:

```text
Build a responsive web UI using the visual language of rubbish.day.

The UI must be dark-first, search/tool-first, and civic-utility focused. Use a near-black #07070f page background with soft blurred radial background blobs in mint, violet, and faint pink. The main content width is 860px with 1.5rem gutters. The first screen should show the actual working interface, not a marketing landing page.

Use system UI fonts. The hero title should be large, light-weight, and tight, with the brand or key word in a mint gradient (#07B98A -> #34d3a8 -> #a5f3dc) plus a soft glow. Body copy is muted white at rgba(255,255,255,0.5), readable, and concise.

The primary interaction panel is a translucent glass card with 22px radius, rgba(255,255,255,0.07) background, backdrop blur around 56px, inset white highlight, deep shadow, and an optional animated conic border using mint, violet, and pink. Inputs are monospace, dark glass, 9px radius, and focus with a mint outline/glow. Primary buttons are mint pill buttons, uppercase, 0.8125rem, 700 weight, 0.1em letter spacing, with subtle hover glow.

Use compact data/result cards below the main panel. Cards are glass surfaces with 14-16px radius, 1px translucent borders, top shine lines, and category tints. Use monospace for dates, addresses, IDs, or measured values. Use small uppercase metadata labels only where useful.

On mobile under 640px, remove decorative background animation, reduce blur, stack the input and primary button, make the primary button full width, and replace wide segmented controls with a full-width native select. Respect prefers-reduced-motion. Include visible focus states and accessible labels.

Avoid generic SaaS dashboards, marketing hero layouts, cartoon styling, heavy illustrations, grain, bokeh, and decorative card nesting. The result should feel like a polished, fast public utility with subtle futuristic glass polish.
```

