# Shadow AI - Design System

The single source of truth for visual design across the marketing site (`shadowai.work`) and the product app (`app.shadowai.work`). If a UI surface deviates from this document, the document wins.

This system was originally extracted from `landing.css`. Token values are framework-agnostic - copy them into Tailwind config, plain CSS variables, CSS-in-JS, or design tooling.

---

## 1. Brand voice

Tone: **serious, scientific, modern.** Direct sentences. No marketing fluff. No exclamation marks. Lowercase punctuation cues like `// Section name` carry meaning - they signal "this is signposting, not the message."

- "Shadow" or "Shadow AI" - never "ShadowAI" (no space-collapse).
- Em-dashes (`-`) are a brand voice marker. Use them where most marketing uses semicolons or "and."
- Numbers stay numbers (`30 experiments / month`, not "thirty experiments per month").
- Avoid: "powerful," "seamless," "leverage," "unlock," "revolutionize," "next-generation," any AI buzzword.

---

## 2. Color tokens

The system uses **two themes** - light (cream-warm) and dark (near-black) - sharing the same semantic token names. Always reference tokens, never raw hex/oklch values, in component code.

### 2.1 Light theme (default)

```css
:root {
  /* Surfaces */
  --bg:        #F7F5F1;  /* page background - warm off-white */
  --bg-2:      #EFEBE3;  /* recessed/quiet sections */
  --paper:     #FFFFFF;  /* raised cards, inputs, modals */

  /* Text */
  --ink:       #0E0F12;  /* primary text, headings */
  --ink-2:     #2A2C31;  /* body text, secondary */
  --muted:     #6B6E76;  /* tertiary, captions, disabled */
  --muted-2:   #9A9CA3;  /* quaternary, placeholders */

  /* Lines */
  --line:      #E4E0D8;  /* default borders, dividers */
  --line-2:    #D6D1C5;  /* hover borders, emphasis */

  /* Brand - electric blue */
  --primary:       oklch(0.58 0.19 240);  /* CTA, accent, focus */
  --primary-ink:   oklch(0.46 0.19 240);  /* primary on hover */
  --primary-tint:  oklch(0.95 0.04 240);  /* subtle tinted backgrounds */

  /* Semantic */
  --accent-warn:   oklch(0.62 0.14 50);   /* errors, destructive */
  --ok:            oklch(0.55 0.10 155);  /* success */
}
```

### 2.2 Dark theme

Toggle via `data-theme="dark"` on `<html>`. Persist user choice in `localStorage.theme`. Apply the attribute **before React mounts** to avoid flash:

```html
<script>
  (function () {
    try {
      var saved = localStorage.getItem("theme");
      var t = saved || (window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", t);
    } catch (e) {}
  })();
</script>
```

```css
[data-theme="dark"] {
  --bg:       #0E0F12;
  --bg-2:     #16181D;
  --paper:    #1B1D23;
  --ink:      #F4F1EA;
  --ink-2:    #D6D1C5;
  --muted:    #9A9CA3;
  --muted-2:  #6B6E76;
  --line:     #2A2C31;
  --line-2:   #3A3D44;

  --primary:       oklch(0.78 0.16 235);
  --primary-ink:   oklch(0.86 0.13 235);
  --primary-tint:  oklch(0.32 0.10 240);
}
```

### 2.3 Color mixing (preferred over hardcoded transparencies)

Use `color-mix()` in `oklab` to derive transparent overlays from tokens. This stays correct across themes:

```css
/* primary at 8% opacity, theme-aware */
background: color-mix(in oklab, var(--primary) 8%, transparent);

/* fade ink to muted on a dark background */
color: color-mix(in oklab, var(--bg) 70%, transparent);
```

Avoid `rgba(0, 0, 0, 0.08)` and similar - they break in dark mode.

---

## 3. Typography

### 3.1 Font families

Three families, each loaded from Google Fonts. Always include `font-feature-settings: "ss01", "cv11"` for Inter Tight stylistic sets that improve scientific number rendering.

```css
:root {
  --f-sans: "Inter Tight", "Inter", -apple-system, BlinkMacSystemFont,
            "Helvetica Neue", Arial, sans-serif;        /* headings, display */
  --f-body: "IBM Plex Sans", -apple-system, BlinkMacSystemFont,
            "Helvetica Neue", Arial, sans-serif;        /* body, UI labels */
  --f-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular,
            Menlo, Consolas, monospace;                  /* code, eyebrows, metadata */
}

body {
  font-family: var(--f-body);
  font-feature-settings: "ss01", "cv11";
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

Load via:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;450;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### 3.2 Type scale

Headings use `--f-sans`, fluid sizing via `clamp()`, and **slightly heavier than typical scientific UI** (450–500) - never bold (700+).

| Style | Font | Size (clamp) | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| `h1` | `--f-sans` | `clamp(40px, 5.6vw, 76px)` | 450 | `-0.028em` | 1.02 |
| `h2` | `--f-sans` | `clamp(28px, 3.4vw, 44px)` | 450 | `-0.022em` | 1.08 |
| `h3` | `--f-sans` | `clamp(20px, 1.8vw, 24px)` | 500 | `-0.018em` | 1.25 |
| `h4` | `--f-sans` | 18px | 500 | `-0.012em` | 1.3 |
| Lede | `--f-body` | 19px | 400 | 0 | 1.55 |
| Body | `--f-body` | 16px | 400 | 0 | 1.55 |
| Caption | `--f-body` | 14px | 400 | 0 | 1.5 |
| Small | `--f-body` | 12.5px | 400 | 0 | 1.45 |
| Eyebrow | `--f-mono` | 12px | 400 | `0.04em` | 1 |
| Code | `--f-mono` | 13.5px | 400 | 0 | 1.5 |

Headings always get `text-wrap: balance;`.

### 3.3 The eyebrow

A signature element - `// Section name` styled as monospace label with a leading horizontal rule. Use sparingly: one per section, top of page heads, top of cards.

```css
.eyebrow {
  font-family: var(--f-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.eyebrow::before {
  content: "";
  width: 18px;
  height: 1px;
  background: var(--muted-2);
}
```

Centered variant: drop `::before` and use `margin: 0 auto`. On dark backgrounds, swap colors to `color-mix(in oklab, var(--bg) 55%, transparent)`.

---

## 4. Spacing & layout

### 4.1 Container & padding

```css
:root {
  --max: 1280px;
  --pad: clamp(20px, 4vw, 56px);
}
.container {
  max-width: var(--max);
  margin: 0 auto;
  padding-left: var(--pad);
  padding-right: var(--pad);
}
```

### 4.2 Section rhythm

Vertical rhythm for full-width sections:

```css
.section {
  padding: clamp(72px, 10vw, 128px) 0;
  border-top: 1px solid var(--line);
}
.section-head { margin-bottom: 56px; max-width: 880px; }
```

Variants:
- `.section-quiet` - `background: var(--bg-2)`, no top border.
- `.section-dark` - `background: var(--ink); color: var(--bg);` for inverted blocks.

### 4.3 Spacing scale

No rigid 8px grid - the system uses **fluid `clamp()` for outer spacing** and **fixed pixel values for inner spacing**. Common values:

| Use | Value |
|---|---|
| Card inner padding | `28px–40px` (component-dependent) |
| Card gap (grid) | `0` (with shared borders) or `20px–24px` (with rounded cards) |
| Stack gap (small) | `8px`, `10px`, `12px` |
| Stack gap (medium) | `16px`, `18px`, `22px` |
| Stack gap (large) | `clamp(24px, 4vw, 64px)` |
| Section internal gap | `24px–56px` |

### 4.4 Breakpoints

Mobile-first with **only three breakpoints**:

| Token | px | Use |
|---|---|---|
| `sm` | `600px` | single-column collapse for cards |
| `md` | `760px` | hero/feature stacking, table scroll |
| `lg` | `920px` | sidebar/showcase collapse |
| `xl` | `1080px` | optional, rarely needed |

Use `@media (max-width: 920px)` style - desktop-first overrides on the way down - to match existing CSS.

---

## 5. Elevation & shadows

Three tiers. Never invent new shadows; pick the closest one.

```css
/* Tier 1 - flat with hairline depth (cards at rest) */
box-shadow:
  0 1px 0 rgba(14, 15, 18, 0.02),
  0 12px 32px -16px rgba(14, 15, 18, 0.10),
  0 32px 64px -32px rgba(14, 15, 18, 0.12);

/* Tier 2 - raised (hover, modals, product screenshots) */
box-shadow:
  0 1px 0 rgba(14, 15, 18, 0.02),
  0 20px 40px -20px rgba(14, 15, 18, 0.15),
  0 32px 64px -32px color-mix(in oklab, var(--primary) 22%, transparent);

/* Tier 3 - featured (primary CTA glow, active state) */
box-shadow:
  0 0 0 1px var(--primary),
  0 24px 48px -24px color-mix(in oklab, var(--primary) 40%, transparent),
  0 48px 96px -48px color-mix(in oklab, var(--primary) 30%, transparent);
```

Shadows always tint with `--primary` at the deepest layer - gives the brand's electric-blue undertone in dark mode and a clean cool tone in light mode.

---

## 6. Border radius

Tight, scientific. Never pill except for tags/pills, never fully circular except for icon buttons and avatars.

| Element | Radius |
|---|---|
| Buttons | `2px` |
| Inputs | `2px` |
| Faux browser windows | `6px` |
| Cards (quiet) | `4px` |
| Cards (raised) | `10px` |
| Cards (premium / pricing) | `12px–14px` |
| Icon containers | `10px` |
| Pills, badges | `999px` |
| Avatars, theme toggle, "+" launcher | `50%` |

---

## 7. Components

Each component below specifies its **anatomy**, **states**, and **drop-in CSS**. Components compose via class names - no nesting required, no preprocessor needed.

### 7.1 Button

Three variants. Always include `.arrow` on right-pointing CTAs - it animates on hover.

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 2px;
  font-family: var(--f-body);
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  border: 1px solid transparent;
  transition: transform 0.2s, background 0.2s, color 0.2s, border-color 0.2s;
  white-space: nowrap;
  cursor: pointer;
}
.btn .arrow { transition: transform 0.2s ease; }
.btn:hover .arrow { transform: translateX(3px); }

.btn-primary   { background: var(--ink); color: var(--bg); }
.btn-primary:hover { background: var(--primary-ink); }

.btn-secondary { background: transparent; color: var(--ink); border-color: var(--line); }
.btn-secondary:hover { border-color: var(--ink); }

.btn-ghost     { background: transparent; color: var(--ink); padding: 12px 8px; }
.btn-ghost:hover { color: var(--primary); }
```

**On dark sections:** primary buttons invert to `background: var(--bg); color: var(--ink);`.

#### CTA glow

For high-priority CTAs (hero, pricing featured, final CTA), add `.cta-glow`:

```css
.cta-glow {
  position: relative;
  isolation: isolate;
}
.cta-glow::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: radial-gradient(circle at 50% 100%,
    color-mix(in oklab, var(--primary) 60%, transparent), transparent 70%);
  filter: blur(12px);
  opacity: 0.7;
  z-index: -1;
  transition: opacity 0.2s;
}
.cta-glow:hover::before { opacity: 1; }
```

### 7.2 Card

Default card:

```css
.card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: border-color 0.2s, transform 0.2s;
}
.card:hover { border-color: var(--line-2); transform: translateY(-2px); }
```

**Faux browser window** - used for product screenshots and mocks:

```css
.window {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}
.window-bar {
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(to bottom, #FBFAF7, #F5F2EC);
  gap: 10px;
}
.window-bar .dots { display: flex; gap: 6px; }
.window-bar .dot  { width: 10px; height: 10px; border-radius: 50%; background: #E0DCD2; }
```

Dark-mode bar: `background: linear-gradient(to bottom, #1F2129, #16181D);` and `dot { background: #3A3D44; }`.

### 7.3 Pricing card

The featured (`.pricing-card-featured`) treatment is reusable for any "selected" or "recommended" card:

```css
.pricing-card-featured {
  border-color: var(--primary);
  box-shadow:
    0 0 0 1px var(--primary),
    0 24px 48px -24px color-mix(in oklab, var(--primary) 40%, transparent),
    0 48px 96px -48px color-mix(in oklab, var(--primary) 30%, transparent);
  transform: translateY(-8px);
}
```

The `★ Most Popular` badge sits at `top: -12px` with `transform: translateX(-50%)`, primary background, mono font. Reuse for any "featured / new / beta" badge.

### 7.4 Input

```css
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field label {
  font-family: var(--f-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
}
.field input,
.field textarea {
  font-family: var(--f-body);
  font-size: 15px;
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 2px;
  padding: 10px 12px;
  transition: border-color 0.2s;
}
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent);
}
```

Labels prefix with `// FIELD NAME` in uppercase mono - matches the eyebrow language.

### 7.5 Pill / domain tag

```css
.pill {
  display: inline-flex;
  align-items: center;
  padding: 9px 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--f-mono);
  font-size: 12.5px;
  letter-spacing: 0.02em;
  color: var(--ink-2);
  background: var(--paper);
  transition: border-color 0.2s, color 0.2s;
}
.pill:hover { border-color: var(--primary); color: var(--primary); }
```

### 7.6 Comparison table

```css
.cmp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.cmp-table thead th {
  font-family: var(--f-mono);
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: uppercase;
  padding: 18px 20px;
  text-align: center;
  border-bottom: 1px solid var(--line);
  background: var(--bg-2);
  font-weight: 400;
}
.cmp-table tbody th {
  text-align: left;
  padding: 14px 20px;
  font-weight: 400;
  color: var(--ink-2);
  border-bottom: 1px solid var(--line);
}
.cmp-table tbody td {
  padding: 14px 20px;
  text-align: center;
  border-bottom: 1px solid var(--line);
}
.cmp-table .cmp-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--primary) 14%, transparent);
  color: var(--primary);
}
```

### 7.7 Theme toggle / icon button

```css
.icon-btn {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, color 0.2s, transform 0.2s;
  cursor: pointer;
}
.icon-btn:hover { border-color: var(--primary); color: var(--primary); }
.icon-btn svg { width: 14px; height: 14px; }
```

### 7.8 Toast

```css
.toast {
  position: fixed;
  bottom: 24px; right: 24px;
  background: var(--ink);
  color: var(--bg);
  padding: 14px 18px;
  font-family: var(--f-body);
  font-size: 14px;
  border-radius: 4px;
  box-shadow: 0 12px 32px -16px rgba(0, 0, 0, 0.2);
  animation: toastIn 0.3s ease;
  z-index: 100;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 8. Motion

### 8.1 Timing

- **Default transition:** `0.2s ease` for hover, focus, color, border, transform.
- **Page enter / reveal:** `0.6s cubic-bezier(0.2, 0.8, 0.2, 1)` for translate + opacity.
- **Toast / popover enter:** `0.3s ease`.
- Avoid anything over `0.6s` for UI feedback.

### 8.2 Reveal-on-scroll

A consistent intersection-observer pattern. Use this hook in any React app:

```tsx
const useReveal = () => {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
};
```

```css
.reveal {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1),
              transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.reveal.in { opacity: 1; transform: translateY(0); }
.reveal.delay-1 { transition-delay: 0.08s; }
.reveal.delay-2 { transition-delay: 0.16s; }
.reveal.delay-3 { transition-delay: 0.24s; }
```

### 8.3 Hover micro-interactions

- Cards: `translateY(-2px)` on hover, `0.2s ease`.
- Featured cards: `translateY(-8px)` at rest, `translateY(-10px)` on hover.
- "+" launcher button: `transform: rotate(90deg)` on hover.
- CTA arrows: `transform: translateX(3px)` on parent hover.

---

## 9. Iconography

### 9.1 Style

**Stroked, never filled.** 1.6px stroke width, round caps, round joins. 14–22px viewport. Always inherit color via `currentColor`.

```html
<svg viewBox="0 0 24 24" width="22" height="22" fill="none"
     stroke="currentColor" stroke-width="1.6"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <!-- paths -->
</svg>
```

### 9.2 Icon containers

When an icon needs a backdrop (privacy cards, feature lists), use a tinted square:

```css
.icon-tile {
  width: 44px; height: 44px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--primary) 12%, transparent);
  color: var(--primary);
}
```

For feature checkmarks in lists, use a circular 20px tile with the same tinted background.

### 9.3 Asset library

When the in-house SVG approach isn't enough, use **Lucide** (`lucide-react`) - already installed. Match the stroke width to 1.6px via CSS to keep visual consistency.

---

## 10. Imagery & media

### 10.1 What we use

- **Real product UI** - actual app screenshots, framed in the `.window` chrome.
- **Custom data viz** - charts, diagrams in brand colors only (`--ink`, `--muted`, `--primary`).
- **Founder portraits** - neutral background, real photos, no Photoshop filters.

### 10.2 What we never use

- Stock photos of "scientists in lab coats."
- AI-generated illustrations of beakers, DNA helices, brain-circuit metaphors.
- Gradients on text (except `--accent` color, never multi-stop rainbows).
- Drop shadows on photos (cards use shadow; raw images don't).
- Icons at the start of headlines.

### 10.3 Product screenshot treatment

Always frame in `.window` chrome (see 7.2). Add an optional primary-tinted ambient glow:

```css
.product-shot {
  box-shadow:
    0 1px 0 rgba(14, 15, 18, 0.02),
    0 20px 40px -20px rgba(14, 15, 18, 0.15),
    0 32px 64px -32px color-mix(in oklab, var(--primary) 22%, transparent);
}
```

---

## 11. Naming conventions

### 11.1 CSS variables

`--<category>` or `--<category>-<modifier>`. Categories used:

```
--bg, --bg-2, --paper       (surfaces)
--ink, --ink-2              (foreground text)
--muted, --muted-2          (de-emphasized text)
--line, --line-2            (borders)
--primary, --primary-ink, --primary-tint   (brand)
--ok, --accent-warn         (semantic state)
--f-sans, --f-body, --f-mono   (font stacks)
--max, --pad                (layout)
```

Never introduce a new top-level variable for a one-off color - derive from existing tokens via `color-mix()`.

### 11.2 Class names

- BEM-lite: `.block`, `.block-modifier`, `.block__element` (use single hyphen when unambiguous).
- Section components: noun-based (`.hero`, `.pricing-card`, `.comparison-table`).
- Modifiers describe state or variant (`.section-quiet`, `.section-dark`, `.pricing-card-featured`).
- Utility-style classes are rare - prefer composed component classes. If a true utility is needed, prefix `.u-` (`.u-text-center`).

### 11.3 React component organization (when reused)

- One component per file in `components/`.
- Section-level components used only on landing live in `components/landing/`.
- Cross-page components (header, footer, theme toggle) live in `components/` root.
- Mocks and faux UI live in `components/landing/mocks.tsx`.

---

## 12. Accessibility minimums

- **Contrast:** all text/background pairs in this system meet WCAG AA. Don't introduce new pairs without re-checking.
- **Focus rings:** every interactive element gets a visible focus state. Default: `box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent);`.
- **Motion:** reveal animations should be skipped under `@media (prefers-reduced-motion: reduce)` - set `.reveal { transition: none; opacity: 1; transform: none; }`.
- **Icons:** every standalone icon button has `aria-label`. Decorative icons inside text have `aria-hidden="true"`.
- **Headings:** one `<h1>` per page. Don't skip levels.

---

## 13. Drop-in `tokens.css`

To bootstrap a new app surface, copy this block into your global stylesheet. Everything else in this document composes on top of these tokens.

```css
:root {
  --bg:            #F7F5F1;
  --bg-2:          #EFEBE3;
  --paper:         #FFFFFF;
  --ink:           #0E0F12;
  --ink-2:         #2A2C31;
  --muted:         #6B6E76;
  --muted-2:       #9A9CA3;
  --line:          #E4E0D8;
  --line-2:        #D6D1C5;
  --primary:       oklch(0.58 0.19 240);
  --primary-ink:   oklch(0.46 0.19 240);
  --primary-tint:  oklch(0.95 0.04 240);
  --accent-warn:   oklch(0.62 0.14 50);
  --ok:            oklch(0.55 0.10 155);

  --f-sans: "Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  --f-body: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  --f-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --max: 1280px;
  --pad: clamp(20px, 4vw, 56px);
}

[data-theme="dark"] {
  --bg:            #0E0F12;
  --bg-2:          #16181D;
  --paper:         #1B1D23;
  --ink:           #F4F1EA;
  --ink-2:         #D6D1C5;
  --muted:         #9A9CA3;
  --muted-2:       #6B6E76;
  --line:          #2A2C31;
  --line-2:        #3A3D44;
  --primary:       oklch(0.78 0.16 235);
  --primary-ink:   oklch(0.86 0.13 235);
  --primary-tint:  oklch(0.32 0.10 240);
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--f-body);
  font-size: 16px;
  line-height: 1.55;
  font-feature-settings: "ss01", "cv11";
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: inherit; text-decoration: none; }
button { font: inherit; background: none; border: 0; cursor: pointer; color: inherit; }
img, svg { display: block; max-width: 100%; }

h1, h2, h3, h4 {
  font-family: var(--f-sans);
  font-weight: 500;
  letter-spacing: -0.018em;
  margin: 0;
  color: var(--ink);
  text-wrap: balance;
}
h1 { font-size: clamp(40px, 5.6vw, 76px); line-height: 1.02; letter-spacing: -0.028em; font-weight: 450; }
h2 { font-size: clamp(28px, 3.4vw, 44px); line-height: 1.08; letter-spacing: -0.022em; font-weight: 450; }
h3 { font-size: clamp(20px, 1.8vw, 24px); line-height: 1.25; font-weight: 500; }
p  { margin: 0; color: var(--ink-2); }
.lede { font-size: 19px; line-height: 1.55; color: var(--ink-2); max-width: 60ch; }
```

---

## 14. Tailwind equivalents (if your app uses Tailwind)

Map the tokens into `tailwind.config.js` so existing utilities work:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg:      "var(--bg)",
        "bg-2":  "var(--bg-2)",
        paper:   "var(--paper)",
        ink:     "var(--ink)",
        "ink-2": "var(--ink-2)",
        muted:   "var(--muted)",
        line:    "var(--line)",
        primary: "var(--primary)",
        ok:      "var(--ok)",
      },
      fontFamily: {
        sans: ["Inter Tight", "Inter", "system-ui"],
        body: ["IBM Plex Sans", "system-ui"],
        mono: ["IBM Plex Mono", "ui-monospace"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "10px",
        xl: "12px",
        "2xl": "14px",
      },
      maxWidth: {
        site: "1280px",
      },
    },
  },
};
```

Then use `bg-bg`, `text-ink`, `border-line`, `text-primary`, `font-mono` etc. - the dark-mode CSS variables flip automatically.

---

## 15. Open questions / future work

These are intentionally undecided - flag in PRs when you hit them, don't invent answers.

- **Data viz palette** - beyond `--primary`, we need a 4–6 color sequential scale for charts. Pending real product needs.
- **Empty states** - illustration approach (custom line art? typographic?) not yet defined.
- **Pricing - billing toggle** - currently both monthly/annual prices show inline. If we move to a toggle, document its mechanics here.
- **App-specific surfaces** - workspace chrome, sidebar, command palette, modal stacking. Add a `§ App surfaces` section once those exist.
- **Logos used by customers** - the "Trusted by" treatment currently shows domain pills, not real logos. When we have customer logos, document height-normalization rules.

---

*Last updated alongside the B2C landing redesign. Source of truth: `landing.css` in this repo.*
