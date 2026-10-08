---
name: workday-onboard
description:
  "Build the personal Workday onboard card. Invoke only when the user runs /workday-onboard. One
  agent query for the signed-in worker's name, job title, and work location, then one inline card.
  Running /workday-onboard again refreshes that card. Do not run this for a normal Workday question,
  for 'what can you do', or because the connector just connected."
---

# Workday onboard

`/workday-onboard` spends one agent run and publishes one card. A normal question, a fresh
connection, and "what can you do?" do not run it — `workday` answers those locally.

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
role list, such as `Betty Liu (manager 4300, CostCtrMgr 30.3, …)`, display only the text before
` (`. Never show the role list.

If the reply skips name, job title, or work location, or replaces one of those with a link, send one
follow-up query for only the missing parts, then build. Anything still missing is `Not returned` on
the card, with the link if Workday returned one. If the query fails: retry the poll once, then say
the connector isn't responding, point to the Configure section of the plugin README, and stop. Never
publish sample data.

## 2. Publish one inline card

Publish with the host's visualize tool, matched by suffix `show_widget`. Pass a content fragment as
`widget_code`: no doctype, no `<html>`, no `<head>`, no `<body>`. Do not also call
`create_artifact`. The card sits in the chat.

Copy this markup. It is the Workday card: white bar, blue band, name, job title, work location, and
pill buttons. Do not restyle it into the host's plain card, and do not drop the blue band because a
visualize guide dislikes gradients. Put this run's values in the JSON block. Render them with
`textContent`. A missing field is `Not returned`, not a filled-in example.

The buttons are exactly `View my tasks`, `View my goals`, and `Give feedback`, in that order. Each
click calls `sendPrompt` with that exact sentence. Do not call `sendPrompt` yourself in this turn.
Do not add other buttons.

```html
<style>
  .wd {
    --b5: #005cb9;
    --b1: #d7eafc;
    --s4: #dfe2e6;
    --l3: #5e6a75;
    --l4: #4a5561;
    --p4: #333333;
    --p5: #1e1e1e;
    font-family: Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    background: #fff;
    border: 1px solid var(--s4);
    border-radius: 12px;
    overflow: hidden;
    color: var(--p4);
  }
  .wd .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 11px 20px;
    border-bottom: 1px solid var(--s4);
    background: #fff;
  }
  .wd .brand {
    font-size: 15px;
    font-weight: 700;
    color: var(--p5);
    letter-spacing: -0.01em;
  }
  .wd .sub {
    font-size: 12px;
    font-weight: 500;
    color: var(--l4);
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
    background: #fff;
    border-radius: 12px;
    border: 1px solid var(--s4);
    padding: 18px 20px;
  }
  .wd h3 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: var(--p5);
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
    color: var(--l3);
  }
  .wd .val {
    font-size: 16px;
    color: var(--p4);
    margin-top: 2px;
  }
  .wd .try {
    margin-top: 16px;
    font-size: 13px;
    color: var(--l3);
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
    color: var(--b5);
    background: #fff;
    border: 1px solid var(--b5);
    border-radius: 999px;
    padding: 7px 14px;
    cursor: pointer;
  }
  .wd button:hover {
    background: var(--b1);
  }
  .wd .foot {
    font-family: 'Roboto Mono', ui-monospace, monospace;
    font-size: 11px;
    color: #787878;
    margin-top: 12px;
  }
</style>
<div class="wd">
  <div class="bar">
    <span class="brand">Workday</span><span class="sub">Sana from Workday · via Claude</span>
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
cannot break out of the script.

If `show_widget` is not in this session, fall back to one side-panel page. It is a full HTML
document: it begins with `<!doctype html>` and `<meta charset="utf-8">` inside `<head>`, and it
follows the escape rules in `using-workday-design`. Stable artifact id `workday-onboard`
(`create_artifact` the first time, `update_artifact` after that). The same greeting, name, title,
and three buttons. A click copies that sentence with `navigator.clipboard.writeText`, then the label
reads "Copied — paste it in chat". If the clipboard is blocked, `window.prompt` shows the sentence.
Tell the user it is the workday-onboard artifact in the side panel, and that a click copies the
question for them to paste.

## 3. Close, then refresh

Under the card, one greeting: "Welcome to Workday, <name>." Do not repeat the job title, location,
or date. Do not submit another Workday call in this turn.

Running `/workday-onboard` again repeats step 1, then publishes the card again. Do not create a
second artifact beside a widget. If the user asks where the card went, it is inline in this chat;
the side panel exists only on the fallback.
