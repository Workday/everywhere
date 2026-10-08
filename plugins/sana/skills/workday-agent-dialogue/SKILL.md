---
name: workday-agent-dialogue
description:
  'Use after Workday routing has already selected an agent, before you send the agent message. Batch
  related parts into one message and confirm an agent write with the user. Do not use for a catalog
  tool call. Do not choose an agent or an agent_id. Load the workday skill first.'
version: '1.0'
tags: [workday, hr]
---

# Workday agent dialogue

Load `workday` first. Routing has already selected the agent. This skill does not choose an agent or
an `agent_id`, and it does not replace a matching catalog tool. A catalog tool returns on that call
and does not use this skill.

## Batch agent questions

An agent run commonly takes 30–90 seconds. Put every related part of the user's request into one
complete message. Do not drip-feed questions that can be answered in one run. Tell the user once
that Workday's agent is working and the answer takes about a minute.

This batching rule does not turn separate operations into one request, and it does not override the
gateway routing skill's fan-out or catalog-tool plan.

## Agent writes require explicit confirmation

For a write routed to a Workday agent:

1. Gather the complete intent before sending the first action.
2. Relay the agent's proposed specifics and corrections to the user.
3. Get the user's explicit confirmation.
4. Send a self-contained final action with the confirmed plan or object, dates, amount or hours, and
   the fact that the user confirmed. Never send a bare "yes".
5. Relay the terminal result exactly. Submitted for approval is not approved.

Agent threads can forget a pending proposal. If that happens, resend the complete confirmed action
instead of relying on prior context. Do not resubmit after an uncertain terminal result without
first checking whether the change already exists.

When routing selects a direct catalog write, follow that catalog tool's gateway skill and
confirmation requirements; do not add a second generic agent dialogue.
