---
name: workday-onboard
description:
  "Build the personal Workday onboard card. Invoke only when the user runs workday-onboard or asks
  for their Workday onboard card. One agent query for the signed-in worker's name, job title, and
  work location, then one inline card. Asking again refreshes that card. Do not run this for a
  normal Workday question or because the connector just connected."
---

# Workday onboard

`workday-onboard` spends one agent run and publishes one card. The user starts it by running the
skill or asking for their Workday onboard card. A normal question and a fresh connection do not run
it.

Load `workday` before the query. Its live gateway routing, catalog-versus-agent choice, agent-id
resolution, and polling are authoritative. For this card, routing must choose an agent. Do not call
a catalog tool. Do not invent an agent id.

## 1. One query

Send a single Workday Query:

> "Please answer all of the following about me: my name, job title and work location."

Send that message verbatim. The gateway agent skill's phrasing advice does not apply to this
message. Do not add time off, payroll, tasks, goals, feedback, the manager, or direct reports. Tell
the user, in these words: "Preparing your Workday card. This takes about a minute." If this session
cannot read resources, poll per `workday-tools-only`. Otherwise follow the routing skill.

Take the name, job title, and work location from the answer. If a name arrives with a parenthetical
role list, such as `Alex Example (manager 4300, CostCtrMgr 30.3, …)`, display only the text before
` (`. Never show the role list.

If the reply skips name, job title, or work location, or replaces one of those with a link, send one
follow-up query for only the missing parts, then build. Anything still missing is `Not returned` on
the card, with the link if Workday returned one. If the query fails: retry the poll once, then say
the connector isn't responding, point to the Configure section of the plugin README, and stop. Never
publish sample data.

## 2. Publish one inline card

Render the card inline in the chat with the host's way of showing HTML in a message: a visualize or
widget tool (for example one whose name ends in `show_widget`), or the host's built-in inline
rendering. Pass a content fragment: no doctype, no `<html>`, no `<head>`, no `<body>`. Publish it
once. Do not also open a separate page. The card sits in the chat.

Copy this markup. It is the Workday card: top bar, blue band, name, job title, work location, and
pill buttons. Do not restyle it into the host's plain card, and do not drop the blue band because a
visualize guide dislikes gradients. Put this run's values in the JSON block. Render them with
`textContent`. A missing field is `Not returned`, not a filled-in example.

The card must read in light and dark themes. It carries both palettes and switches with
`prefers-color-scheme`. Keep every color in the `.wd` tokens. Do not swap them for the host's theme
variables, and never set a background without the text color from the same palette, or the text
turns light gray on white in dark mode. If the host draws the card with its own UI components
instead of this HTML, host components can't overlap the name card onto the band, so merge the top
bar into the band: one solid `#005cb9` band at the top of the card holding `Workday` (bold) and
`Sana from Workday · via <Host>` in white. If the host only offers a light blue tint for the band,
use the host's default dark text there instead of white. The name, job title, work location, and
buttons go below the band. Do not set any other surface background or text color: let the host theme
color them, and use `#005cb9` only for the band. Draw the three buttons with the host's standard
outlined button, so each label and outline takes the host theme's normal text and border colors and
reads clearly in dark and light themes. Do not give them a `#005cb9` outline, which is too dark on a
dark surface. A button whose click sends its sentence is enabled and drawn at full strength. Dim,
mute, or disable a button only when a click cannot send its sentence in this host.

The buttons are exactly `View my tasks`, `View my goals`, and `Give feedback`, in that order. Each
click sends that exact sentence as the user's next message, through the host's send function (for
example `sendPrompt`). Do not send those sentences yourself in this turn. Do not add other buttons.

```html
<style>
  .wd {
    color-scheme: light;
    --surface: #ffffff;
    --line: #dfe2e6;
    --ink: #333333;
    --ink-strong: #1e1e1e;
    --hint: #5e6a75;
    --hint-2: #4a5561;
    --accent: #005cb9;
    --accent-soft: #d7eafc;
    font-family: Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
    color: var(--ink);
  }
  @media (prefers-color-scheme: dark) {
    .wd {
      color-scheme: dark;
      --surface: #1f2328;
      --line: #3a4048;
      --ink: #e3e6e9;
      --ink-strong: #f6f7f8;
      --hint: #a9b3bd;
      --hint-2: #c3cbd3;
      --accent: #7cbcff;
      --accent-soft: #16314f;
    }
  }
  .wd .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 11px 20px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }
  .wd .brand {
    font-size: 15px;
    font-weight: 700;
    color: var(--ink-strong);
    letter-spacing: -0.01em;
  }
  .wd .sub {
    font-size: 12px;
    font-weight: 500;
    color: var(--hint-2);
  }
  .wd .hero {
    height: 64px;
    background: linear-gradient(120deg, #005cb9, #0057ae 55%, #013f80);
  }
  .wd .body {
    padding: 0 20px 20px;
    margin-top: -34px;
  }
  .wd .card {
    background: var(--surface);
    border-radius: 12px;
    border: 1px solid var(--line);
    padding: 18px 20px;
  }
  .wd h3 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: var(--ink-strong);
  }
  .wd .rows {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }
  .wd .lbl {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--hint);
  }
  .wd .val {
    font-size: 16px;
    color: var(--ink);
    margin-top: 2px;
  }
  .wd .try {
    margin-top: 16px;
    font-size: 13px;
    color: var(--hint);
  }
  .wd .btns {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .wd button {
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    color: var(--accent);
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 999px;
    padding: 7px 14px;
    cursor: pointer;
  }
  .wd button:hover {
    background: var(--accent-soft);
  }
  .wd .foot {
    font-family: 'Roboto Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--hint);
    margin-top: 12px;
  }
</style>
<div class="wd">
  <div class="bar">
    <span class="brand">Workday</span><span class="sub">Sana from Workday · via <Host></span>
  </div>
  <div class="hero"></div>
  <div class="body">
    <div class="card">
      <h3 id="n"></h3>
      <div class="rows">
        <div>
          <div class="lbl">Job title</div>
          <div class="val" id="t"></div>
        </div>
        <div>
          <div class="lbl">Work location</div>
          <div class="val" id="l"></div>
        </div>
      </div>
      <div class="try">Here are some things to try</div>
      <div class="btns" id="b"></div>
      <div class="foot" id="f"></div>
    </div>
  </div>
</div>
<script type="application/json" id="d"></script>
<script>
  var d = JSON.parse(document.getElementById('d').textContent);
  document.getElementById('n').textContent = d.name || '';
  document.getElementById('t').textContent = d.title || 'Not returned';
  document.getElementById('l').textContent = d.location || 'Not returned';
  document.getElementById('f').textContent = d.foot || '';
  var b = document.getElementById('b');
  d.buttons.forEach(function (s) {
    var e = document.createElement('button');
    e.type = 'button';
    e.textContent = s;
    e.addEventListener('click', function () {
      sendPrompt(s);
    });
    b.appendChild(e);
  });
</script>
```

The JSON is `{"name","title","location","foot","buttons"}`. `buttons` is those three sentences.
`foot` is `Asked Workday's agent on <Month D, YYYY>`. Write the JSON with a serializer so a name
cannot break out of the script. `<Host>` in the bar is the name of the assistant app you are running
in.

If the host cannot show HTML inside the chat, fall back to one separate page the host offers (a
side-panel page, canvas, or file). It is a full HTML document: it begins with `<!doctype html>` and
`<meta charset="utf-8">` inside `<head>`, and it follows the escape rules in `using-workday-design`.
Give it the stable id `workday-onboard` when the host lets you update a page, so running the skill
again updates the same page. The same greeting, name, title, and three buttons. A click copies that
sentence with `navigator.clipboard.writeText`, then the label reads "Copied — paste it in chat". If
the clipboard is blocked, `window.prompt` shows the sentence. Tell the user where the page is, and
that a click copies the question for them to paste.

## 3. Close, then refresh

Under the card, one greeting: "Welcome to Workday, <name>." Do not repeat the job title, location,
or date. Do not submit another Workday call in this turn.

Running `workday-onboard` again repeats step 1, then publishes the card again. Do not create a
separate page beside an inline card. If the user asks where the card went, it is inline in this
chat; a separate page exists only on the fallback.
