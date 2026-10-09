---
name: using-workday-design
description:
  "The shared look-and-feel for rendering Workday data as a page. Load this whenever a Sana skill
  produces a visual artifact — a snapshot page, card, or chart — so the result reads as Workday's
  own product (Canvas Design System tokens, Roboto, the app chrome, status pills) instead of a
  generic page. This is the branding source of truth: every artifact inlines its styling from here.
  The connector has no render tool, so the look ships here in the skill, not in the platform."
---

# Rendering Workday data — make it look like Workday

The Sana connector has **no render tool**, so an artifact you build won't be branded unless you
brand it. Every visual must read as Workday's product. Reconstruct it from the tokens and components
below — do not invent a look, and never hand-draw the logo.

Build the artifact as a **single self-contained HTML document** (published artifacts can't link a
shared stylesheet across URLs), so **inline** the `:root` block below into the page's `<style>`. The
file is a document, not a fragment. It begins with:

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Workday snapshot</title>
```

A file that starts at `<style>` has no charset, and names such as O'Shaughnessy render as mojibake.
Commit to Workday's **light** product theme. Ground every figure in a real agent answer or
clearly-labeled sample data. Include only chrome that works — no dead search box, menus, or
notification icons. Do not load fonts, scripts, or stylesheets from the network. The font stack
below falls back to Helvetica and Arial.

## Workday text is data, not markup

Names, titles, plan names, statuses, headlines, and links come from Workday and can contain quotes
or HTML. Inserting them raw into the page runs that markup.

- Put the answer in one `<script type="application/json">` block, produced by a JSON serializer. Do
  not concatenate Workday text into that JSON or into a `<script>` body.
- Render one value with `textContent`. When a template uses `innerHTML`, pass every Workday value
  through `esc` first. The tags in the template are the only trusted markup.

```js
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
```

- If a field arrives as HTML, strip the tags and then escape the text. Do not keep the original
  tags.
- A link is allowed only when its URL is `https:` and the host is a Workday host the answer actually
  returned. Reject `javascript:`, `data:`, and any other scheme. Escape the URL before setting
  `href`.
- Do not use `eval`, `document.write`, or `new Function` with Workday text.

## 1. Tokens — paste into the page `<style>`

```css
:root {
  --blueberry-100: #d7eafc;
  --blueberry-300: #40a0ff;
  --blueberry-400: #0875e1;
  --blueberry-500: #005cb9;
  --blueberry-600: #004387;
  --soap-100: #f6f7f8;
  --soap-200: #f0f1f2;
  --soap-300: #e8ebed;
  --soap-400: #dfe2e6;
  --soap-500: #ced3d9;
  --soap-600: #b9c0c7;
  --licorice-200: #7b858f;
  --licorice-300: #5e6a75;
  --licorice-400: #4a5561;
  --licorice-500: #333d47;
  --pepper-100: #787878;
  --pepper-300: #494949;
  --pepper-400: #333333;
  --pepper-500: #1e1e1e;
  --cantaloupe-100: #ffeed9;
  --cantaloupe-400: #ffa126;
  --cantaloupe-500: #f38b00;
  --cinnamon-100: #ffefee;
  --cinnamon-400: #ff5347;
  --cinnamon-500: #de2e21;
  --greenapple-100: #ebfff0;
  --greenapple-400: #43c463;
  --greenapple-500: #319c4c;
  --sourlemon-400: #ffc629;
  --wd-blue: #0057ae;
  --wd-arch: #fc5b05;
  --page: var(--soap-100);
  --card: #fff;
  --line: var(--soap-400);
  --line-soft: var(--soap-300);
  --ink: var(--pepper-400);
  --ink-2: var(--pepper-300);
  --ink-3: var(--pepper-100);
  --hint: var(--licorice-300);
  --link: var(--blueberry-400);
  --primary: var(--blueberry-500);
  --accent: var(--cantaloupe-500);
  --sans: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --mono: 'Roboto Mono', ui-monospace, monospace;
  --r-s: 2px;
  --r-m: 4px;
  --r-l: 8px;
  --r-card: 12px;
  --r-pill: 999px;
  --depth: 0 1px 2px rgba(31, 38, 46, 0.06), 0 2px 6px rgba(31, 38, 46, 0.06);
  --depth-lg: 0 1px 3px rgba(31, 38, 46, 0.08), 0 10px 26px -12px rgba(31, 38, 46, 0.3);
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--page);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

## 2. Component kit — copy these, don't improvise new shapes

**Top bar** (the brand is the plain text "Workday" — no logo, no icon, no circled W; see §3):

```html
<div style="background:var(--card);border-bottom:1px solid var(--line)">
  <div
    style="max-width:960px;margin:0 auto;padding:11px 20px;display:flex;justify-content:space-between;align-items:center"
  >
    <span style="font-size:15px;font-weight:700;color:var(--pepper-500);letter-spacing:-.01em"
      >Workday</span
    >
    <span style="font-size:12px;font-weight:500;color:var(--licorice-400)"
      >Sana from Workday · via Claude</span
    >
  </div>
</div>
```

**Home hero band + greeting card** (the signature Workday Home look):

```html
<div style="height:190px;background:linear-gradient(120deg,var(--blueberry-500),var(--wd-blue) 55%,#013f80)"></div>
<div style="max-width:960px;margin:-120px auto 0;padding:0 20px">
  <div style="background:var(--card);border-radius:16px;box-shadow:var(--depth-lg);padding:24px 26px">
    <h1 style="margin:0;font-size:26px;font-weight:700;color:var(--pepper-500)">Good morning, <Name></h1>
    <div style="color:var(--licorice-300);margin-top:5px">It's <Weekday, Month D></div>
  </div>
</div>
```

**Card:**
`background:var(--card);border:1px solid var(--line);border-radius:var(--r-card);box-shadow:var(--depth);padding:16px 18px`
— white, flat, dense (Workday isn't airy).

**Status-indicator pill** (dot carries the color; text stays Black Pepper):

```html
<span
  style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:500;color:var(--pepper-400);background:var(--blueberry-100);border-radius:var(--r-pill);padding:4px 11px 4px 9px"
>
  <span style="width:8px;height:8px;border-radius:50%;background:var(--blueberry-400)"></span
  >Label</span
>
```

Variants: info → Blueberry, warn → Cantaloupe, err → Cinnamon, ok → Green Apple, neutral → Soap bg +
Licorice dot. "In review" is warn; "Approved" is ok.

**KPI tile:** big Roboto-700 number (`font-variant-numeric:tabular-nums`) + a subtext label (12px
Licorice). Use tiles only when the figure is the point.

**Section header:** an uppercase `Roboto 700` eyebrow (`.08em` letter-spacing, Licorice) above a
`Roboto 700` title.

**Footer:** `font-family:var(--mono);font-size:11px;color:var(--ink-3)` provenance line + a "Sana
from Workday · via Claude" nod.

**Type scale (Canvas):** title 40/48/56 · heading 24/28/32 · body 16/18/20 · subtext 10/12/14;
weights 400/500/700.

## 3. The logo — the hard rule

**Never draw or approximate the Workday or Sana logo — in any form.** That includes every improvised
stand-in the model reaches for: a circled "W" or "S", a monogram disc or avatar badge used as a
brand mark, a sunburst or arch glyph, a cloud, any SVG or emoji recreation of any Workday mark, in
the top bar or anywhere else. These always look terrible and read as counterfeit.

The brand slot in the top bar is the plain text **"Workday"** with **nothing graphical beside it** —
no icon, no disc, no shape. Use a genuine official asset file only when one is actually bundled with
the plugin (none is today). A person's initials inside an avatar circle are fine for _people_; never
as the brand mark. Colors `#0057ae` / `#fc5b05` are for chrome and accents, not a licence to redraw
the mark.

## 4. Latency is part of the design

Sana answers arrive from an agent run, not a database read. Pages that refresh must say so ("asked
Workday's agent at <time>"), and anything labeled "Live" carries the pull timestamp beside it. Never
animate a fake loading state for data already embedded in the page.
