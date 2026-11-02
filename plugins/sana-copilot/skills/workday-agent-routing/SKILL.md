---
name: workday-agent-routing
description: "Shared Workday agent routing and cross-cutting guidance. Read this before choosing among workday-agent-* skills. Shortlist children from their resource `description` under the `workday-agent/` segment — always resources/read the child skill to disambiguate. Also covers verbs, reply parsing, threading, policy overrides, multi-agent fan-out, default agent, and shared response rules."
metadata:
  wid: "63493ac04f601000568f0992329d0000"
  allowedTools: "send_query_to_workday_plugin send_a2ui_action_to_workday_plugin get_workday_plugin_run_status"
---

# Workday agent routing

Routing skill for the Workday agent hierarchy. Agent skills live under the same `workday-agent/`
path (`workday-agent-ess`, …). Read this first. Child `description` fields are shortlist hints only
— always `resources/read` the candidate child and use its body to disambiguate before calling a
verb; the child body supplies the confirmed `agent_id` and any agent-specific extras.

## 1. Discover the roster

`resources/list` to see child `workday-agent-*` resources under the `workday-agent/` segment and
their `description`. The list is the **skill catalog** for this gateway — which children are
published — not live agent availability. Agents can be turned on or off independently of whether
their skill appears here; a listed child may still fail at call time. List entries are not enough to
choose an agent on their own — always `resources/read` the candidate child (or children) and use the
skill body for disambiguation before calling a verb. Never invent an `agent_id`, carry one from
another tenant, or derive one from a federated `rigel__…` tool name. Use only an `agent_id` that the
read child skill documents.

## 2. Choose the verb

| Verb                                 | Use for                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `send_query_to_workday_plugin`       | Questions, lookups, and write intents — submit, approve, mutate (confirm details with the user first). Also resume when the prior run status is `interrupted` and there is no `ui_intent`. |
| `send_a2ui_action_to_workday_plugin` | Resuming an interrupt or approval flow the agent started (`ui_intent`)                                                                                                                     |

Example arguments (host/transport prefixes the tool name):

```json
{
  "message": "Who are my direct reports?",
  "agent_id": "ess_agent_service"
}
```

## 3. Reading a reply

Submit tools share one 20 second Agent Forge budget across thread setup and the created run, and
join that run before returning. Check `status`: read and answer a terminal result (`success`,
`error`, `timeout`, or `interrupted`) without polling. For `pending` or `running`, poll
`get_workday_plugin_run_status` with those three ids until status is terminal. Each status call
joins that same run for up to 20 seconds. Do not send a new query or action while waiting, and do
not hand the poll loop to a sub-agent — the run payload can carry `ui_intent` that must reach §10
intact.

**Poll cadence:** wait **5 seconds** before every `get_workday_plugin_run_status` call, including
the first. Poll one run at a time — never parallel polls or sub-agent poll loops for the same
`agent_id`/`thread_id`/`run_id`. If status is still `pending` or `running`, wait **5 seconds** and
poll that run again. Do not use exponential backoff, and do not call status back-to-back for the
same run. After a resume send\_\*, restart the 5-second wait and the 2-minute limit below. An
occasional transient error on a poll is not a terminal status — wait 5 seconds and call again.

**After 2 minutes, move the poll to a background task.** Count from when the submit or resume call
returned. If the run is still `pending` or `running`, stop polling in this turn. Tell the user the
Workday agent is still working, then continue that same poll in a background task: the same
`agent_id`, `thread_id`, and `run_id`, still waiting 5 seconds between status calls, still one poll
at a time. When the run reaches a terminal status, bring `text` and any `ui_intent` back to this
chat (§10). Do not start a new query or action for that run, and do not hand the background task to
a sub-agent.

**Long waits — recurring-prompt hosts (host-optional).** The 2-minute foreground poll can still tie
up a turn. When the host offers a recurring prompt, use it only inside that window, paced to the
5-second wait. In Claude Code that is `/loop` with **no interval** (e.g.
`/loop check the status of my Workday run`) so the model paces its own next wake-up — do not pin an
interval shorter than 5 seconds, and do not start another poll while a status call is in flight. At
2 minutes, stop the recurring prompt and move the poll to a background task as above. One poll at a
time, the same `agent_id`/`thread_id`/`run_id` throughout, and any `ui_intent` must still reach §10
within the session that owns the thread. Hosts without a recurring prompt follow the 5-second wait
above until the 2-minute handoff.

Once terminal, the useful payload is JSON with `text`, `thread_id`, `agent_id`, and optional
`ui_intent`. Parse that JSON first; strip any fenced ` ```a2ui ` blocks from `text` before speaking
to the user; never show raw envelopes, fences, `thread_id`, or `combination_id` in chat. Keep
continuation IDs only for later tool calls.

Lead with the answer. Never invent Workday data. Never show raw JSON or Workday IDs to the user.

If the poll result includes a `ui_intent` (or fenced A2UI), render it for the user, then continue
with `send_a2ui_action_to_workday_plugin` using the same `agent_id` and thread (`combination_id`
when the prior payload has one, otherwise `thread_id`), plus the action `name` and resolved
`context`. Children document any agent-specific extras.

If status is `interrupted` and there is no `ui_intent`, resume with `send_query_to_workday_plugin`
on the same thread and the user's reply.

## 4. Multi-step / fan-out first

One tool call reaches one agent. If the user needs facts from agent A to act in agent B, plan the
sequence — do not collapse the turn into one call.

1. Call the agent that holds the facts first.
2. Call the agent that acts, quoting the facts from step 1.
3. Combine both results for the user.

Other shapes: org or team context before an action; a policy lookup before answering a policy
question.

## 5. Single domain — description shortlist, then read the skill

`resources/list` returns each child with a `description` under the `workday-agent/` segment. That
`description` is the **only list-time routing hint**. Soft domain cues to shortlist children.

**Do not** treat a description keyword match as final. Domains collide (e.g. hardware words vs
policy framing). Always:

1. Shortlist one or more children whose `description` looks relevant.
2. `resources/read` those child skills and disambiguate using description, when-not-to-use, and
   instructions.
3. Call the verb with the `agent_id` documented in the skill body you selected. If two skills still
   fit, prefer policy-override (§6), then the default child (§7), then ask the user. §6 overrides a
   child's when-not-to-use for the intents it names. For those intents, do not stop because the
   child excludes the topic.

Do not invent an `agent_id` that the selected child's skill body did not document.

Domain examples (authoritative cues live in each child's `description`; the skill body wins on
conflicts except the intents §6 sends to ESS anyway):

| Domain                           | Example description cues                            |
| -------------------------------- | --------------------------------------------------- |
| Employee / manager self-service  | time off, PTO, my team, org chart, company policies |
| Tenant policy & procedure lookup | policy, procedure, guideline                        |

## 6. Policy framing wins (override)

If the message frames a question as **policy, procedure, or guideline** — e.g. "what's the policy on
laptop refresh?", "any policy on hardware replacement?", "is there a procedure for access requests?"
— use a **policy-capable** child (self-service / policy-search), even when hardware or access words
are present.

A child's when-not-to-use may exclude hardware, access, and service work. That exclusion applies
only when another published child covers that work. When none does, send the request to ESS
(`ess_agent_service`). Do not stop because the ESS skill excludes the topic, and do not look for a
catalog case or order tool.

Send these to ESS even when the subject is hardware, IT, travel, or another worker:

- Looking up the signed-in worker's own orders, requisitions, or purchase history, including
  hardware line items (Dell, monitors, smartboards, completed orders). This is a record lookup, not
  fulfillment.
- Creating or opening a case of any type (Travel, IT Incidents, HR). Send it. If ESS cannot submit,
  return its explanation and any task link. Do not refuse before the call.
- A staffing change on another worker (a transfer, closing a position) when no other published child
  covers it. Send it to ESS and report what ESS returns.
- Hypothetical pay ("what if I made $X an hour"). Do not calculate it yourself. Send it to ESS.

Placing or fulfilling a new hardware or access request stays off ESS only when another published
child covers it. Requisition and pipeline lookups the employee is authorized to see stay on the
self-service child. Sourcing and outreach have no published child.

**Catch-all when policy search is not available.** Any agent can be turned on or off independently
of the skill catalog, so a listed child may still be unreachable. No specific agent is guaranteed to
succeed. When the preferred policy call fails because the agent or policy search is unavailable (or
the reply clearly says it cannot help):

1. Retry with another **listed** child whose skill body covers policy lookups — `resources/read` it
   first.
2. Otherwise try the default child (§7), if different from the one that failed.
3. Otherwise tell the user policy help is not available right now.

Never invent an `agent_id`, never target a child absent from the list, and never answer policy from
general knowledge.

## 7. Default agent

Only after description shortlisting and `resources/read` disambiguation still leave no clear winner,
prefer `workday-agent-ess` when it is in the catalog (its description marks it as the ambiguous-case
default). If that child is absent or its call fails because the agent is unavailable, fall through
the same catch-all as §6 (other listed candidates, then tell the user).

## 8. Continuations

Submit and poll results carry `thread_id`. The send tools also accept `combination_id` (`thread:…`).
When a prior payload includes `combination_id`, pass that back on the next same-chat turn with the
same agent; its thread component (before the first colon) supersedes `thread_id`. Everything after
the first colon is ignored by these tools — do not invent a separate `plan_id`.

```json
{
  "message": "Who does Lauren Wu report to?",
  "agent_id": "ess_agent_service",
  "combination_id": "7f3c…:plan-42"
}
```

If there is no `combination_id`, pass `thread_id` from the submit or poll result. Send only the
user's newest utterance. Omitting both starts a fresh conversation.

Poll `get_workday_plugin_run_status` with `agent_id`, `thread_id`, and `run_id` from the submit
result — not the raw `combination_id` string.

When the prior reply returned `agent_id` plus a thread (`combination_id` or `thread_id`) and the
user is clearly continuing that thread, reuse both. Re-pick an agent only on a clear domain switch.

## 9. When something fails (agent path)

| Symptom                               | Do this                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Internal error` within a few seconds | Likely wrong `agent_id` — re-read the child's skill resource                                            |
| `Internal error` after ~60s           | Gateway timeout — offer a narrower question; don't retry unchanged                                      |
| Agent / policy search unavailable     | Listed skill ≠ live agent. For policy, follow §6 catch-all; else try the default child or tell the user |

Auth, missing-server, and host-tool failures are handled by the host plugin skill.

## 10. Shared response / A2UI (host + CTF)

Read the dedicated `workday-agent-response-ui` resource for A2UI handling and markdown formatting of
panels and tables. Verb/resume rules above still apply.
