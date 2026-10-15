---
name: workday-tools-only
description:
  'Use when a Workday session has tools but cannot read MCP resources (no ListMcpResourcesTool or
  ReadMcpResourceTool). Prefer list_workday_plugin_skills and get_workday_plugin_skill as the
  substitute for resources/list and resources/read, then poll an agent run and render A2UI as
  markdown. Do not use when a resource reader exists. Load the workday skill first. Do not invent an
  agent_id.'
version: '1.2'
tags: [workday, hr]
---

# Workday without gateway resources

Load `workday` first. Its rule against inventing `agent_id`, and its sign-in, scope, and
denied-access cases, stay there. This skill applies only when the session has no resource reader.
Check the tool list once. Do not search for a resource reader again in that session.

## Read skills through the plugin verbs

`list_workday_plugin_skills` and `get_workday_plugin_skill` are the substitute for `resources/list`
and `resources/read` on this host (Cowork has no MCP resource primitives). Match them by suffix.
Before the first Workday call:

1. Call `list_workday_plugin_skills`. Each link has a `name` (e.g.
   `workday-agent/workday-agent-routing`) and an exact `uri` (e.g.
   `skill://workday/composite-mcp/workday-agent/workday-agent-routing/SKILL.md`).
2. Call `get_workday_plugin_skill` with that **exact `uri`** for routing. Never invent a `skill://`
   path or pass a bare skill name.
3. Shortlist child `workday-agent-*` links from their list `description`, then
   `get_workday_plugin_skill` with each candidate's exact `uri`. Follow the selected skill body.

Take `agent_id` from that skill body (`agent_id="…"`) or from `_meta.agent_id` when the gateway sets
it. Do not call a catalog tool or an agent until routing and the skill for the call have been read.
A description match is not enough.

If those skill verbs are missing from this session's tool list, fall back to the catalog and agent
rules below and copy `agent_id` from the submit tool's description or `inputSchema` only.

## Catalog tools and agents

- **Catalog tools.** Call one by exact name when its description matches the operation, whose
  records, and the requested output. Decide from the complete request; do not probe a nearby tool
  before using an agent. A payslip lookup does not cover bonuses or payroll modeling, a recruiting
  requisition is not a purchase order, and an absence balance does not start a leave journey. A
  nearby tool is not a substitute. Search by the entity and the operation. A query that is only
  `workday` misses catalog tools whose names do not contain that word. An empty search is not proof
  that no catalog tool exists.
- **Agents.** When no catalog tool matches, use a submit verb with the `agent_id` from the skill you
  just read, or — only if the skill verbs were missing — from that tool's description or
  `inputSchema`. Copy it verbatim.
- **Empty results.** A successful empty result is the answer only when that catalog tool exactly
  covers the requested entity, operation, records, and output. Say what you searched for, and do not
  retry the same read through an agent. An empty pick list, prerequisite, model-added filter, or
  partial lookup does not make the full request empty; continue its already-planned parts.
- **`S22`.** Denied access for that part. The user is signed in. Do not retry it through another
  path, and do not ask them to sign in again. Tell the user, then report each other part as
  succeeded or failed.

## Agent runs

Submit returns `run_id`, `thread_id`, and `agent_id` with status `pending` or `running`. Poll
`get_workday_plugin_run_status` with those three ids. Wait 5 seconds before every poll, including
the first. Do that wait in the same turn. `pending` and `running` are not a decline. After about 2
minutes, continue that poll in a background task. A wait between polls is not a message to the user.
The reply they see is the terminal answer, not a note that a timer finished.

When routing has selected an agent, also read `workday-agent-dialogue` before you send.

## A2UI without a rendered surface

This host has no MCP App iframe. When a terminal result has `ui_intent.a2ui_messages`, or a fenced
`a2ui` block in `text`, that payload is authoritative. Apply each `updateDataModel`, then resolve
component and action `path` references against that model. Reproduce every visible label, value, and
choice in markdown, in the returned order. Do not summarize, drop, renumber, or invent options. Do
not show the raw envelope, JSON, `thread_id`, `run_id`, or Workday IDs.

When the resolved surface asks the user to choose or confirm, show those choices and wait. On the
user's answer, call `send_a2ui_action_to_workday_plugin` with the original event `name`, the
resolved `context` (no unresolved `{ "path": "..." }` references), and the same `agent_id` and
`thread_id`. Then poll again.

If status is `interrupted` and there is no `ui_intent`, resume with `send_query_to_workday_plugin`
on the same thread. Poll again.

When there is no `ui_intent`, parse the terminal JSON, strip any `a2ui` fence from `text`, and lead
with the answer. Never show raw JSON, `thread_id`, `run_id`, or Workday IDs.
