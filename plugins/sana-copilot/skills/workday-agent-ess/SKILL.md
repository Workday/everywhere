---
name: workday-agent-ess
description: "Use for employee self-service — time off, PTO, absences, vacation balances, worker profile, benefits, pay, goals and feedback, learning, inbox, recruiting, expenses, company policies, HR procedures, leave policies, and HR knowledge base search. Prefer this child when phrasing stays ambiguous after reading skills. Do not use for IT hardware orders, access provisioning, or service requests. Relevant phrases include sick leave, leave balance, request time off, my profile, my manager, my team, my department, org chart, who am I, my pay, payslip, benefits, bonus, goals, feedback, learning, inbox, expense report, requisition, policy on or for, company policy, procedure for, guideline on, vacation accrual, reimbursement guidelines, and code of conduct."
metadata:
  wid: "b311957b769f1000265696a8fdd60000"
  allowedTools: "send_query_to_workday_plugin get_workday_plugin_run_status"
---

# Workday ESS Agent

## When NOT to use

IT hardware or service requests (laptops, equipment, access grants, onboarding/offboarding) are not
handled by this agent, even when the request is on behalf of another employee.

## Instructions

- Pass `agent_id="ess_agent_service"` on every tool call.
- Questions (balance, policy lookup, status) and write actions such as submitting time off: call
  `send_query_to_workday_plugin`. Confirm the details of a write action with the user first.
- Pass the `thread_id` from a previous response back into the next call to continue the
  conversation; omit to start a new thread.

## Request playbook

Goal: a correct, complete answer in **one Workday turn** whenever the data allows it, and a truthful
answer in at most three. This playbook layers on `workday-agent-routing` and
`workday-agent-response-ui`. Where they say how to call the gateway, the sections below say **what
to ask** and **when to stop**. Every rule removes a failure that actually happened against the ESS
agent.

### 1. Protocol (unchanged from the routing skill)

- Pass `agent_id="ess_agent_service"` on every call. Reads and write intents both use
  `send_query_to_workday_plugin`.
- Follow the routing skill's poll: wait 5 seconds before each `get_workday_plugin_run_status`, one
  poll at a time. After 2 minutes, stop the foreground poll and move it to a background task.
- Continue a thread with `thread_id` for follow-ups. **Start a fresh thread after any refusal or
  `Internal error`** (a refused thread tends to refuse again; the fresh thread is what recovers).
- Terminal statuses: success, error, timeout, interrupted. A confirmation prompt arrives as
  `success` with plain text ("Please confirm") and `ui_intent` null; treat that text as the gate.

### 2. Shape the first message (this is where turns are won)

Workday's agent answers exactly what it is asked and no more; when a list is long it summarizes,
when a request is loose it picks a tool for you. So the first message must be complete and specific:

1. **Name every field you need**, in the employee's own words, first person ("my", "I"). One message
   per intent; several intents in one request are fine if they are about the employee.
2. **Ask for complete lists explicitly**: "list every entry, not a summary; if there are more than
   25, say how many there are in total and give the first 25". This prevents the 5-row / 1-quote
   summaries that cost a second turn.
3. **Ask for the total and the coverage** whenever the answer could be a subset: "state the total
   number of X and how many of them you have included".
4. **Ask for the as-of date** on anything that changes over time (balances, inbox, payslip). Workday
   returns two different PTO figures from two tools; only the request that says **"as of today"**
   and asks for the as-of date returns the available-today balance with a date.
5. **Avoid these phrasings**, each of which triggered a wrong tool or a refusal in testing: "time
   off balances" / "all my balances" (returns the plan balance, not today's), "search again" /
   "retrieve all pages" / "all remaining candidates" (privacy refusal), a bare "what is <coworker>'s
   title, location and hire date" (privacy refusal; see §3 T16), and any request that asks Workday
   to _compute_ a hypothetical (see §3 T14).
6. **Do not ask the employee questions.** State an assumption ("I read 'my organization' as the
   requisitions you are authorized to see") and answer.

### 3. Intent playbook

Each row gives the first message to send, the check to make on the reply, and the single follow-up
allowed if the check fails.

| Intent                                | First message (adapt names, keep the shape)                                                                                                                                                                                                                                                                                                                              | Check the reply for                                                                                                                                                   | One allowed follow-up                                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PTO / time-off balance**            | "What is my Paid Time Off balance and my Floating Holiday balance as of today? For each plan, give the as-of date and the hours available to use today."                                                                                                                                                                                                                 | An as-of date and one figure per plan. If the reply has no as-of date it came from the plan-balance tool; say so.                                                     | Re-send the same message on a fresh thread once.                                                                                                                                                                                                                          |
| **Manager / title / org**             | "Who is my manager, what is my business title, and which supervisory organization am I in?"                                                                                                                                                                                                                                                                              | All three present.                                                                                                                                                    | Ask for the missing field by name.                                                                                                                                                                                                                                        |
| **Direct reports**                    | "List all of my direct reports by name with their business titles. State how many there are in total."                                                                                                                                                                                                                                                                   | Count matches list.                                                                                                                                                   | none                                                                                                                                                                                                                                                                      |
| **Benefits elections**                | "List all of my current benefits elections: plan, coverage level or election amount, and provider, for medical, dental, vision, retirement, FSA and life insurance."                                                                                                                                                                                                     | Every category answered or marked 'none'.                                                                                                                             | Ask for the missing category.                                                                                                                                                                                                                                             |
| **Compensation & bonus**              | "Show my total compensation statement (total, base pay, and each component) and my complete bonus payment history: every bonus event with date and amount, not just the most recent, plus my stock grants (number of grants, shares granted, vested, unvested)."                                                                                                         | Bonus list not truncated ("5 most recent" ⇒ follow up).                                                                                                               | "Please list all N bonus events with date and amount." on the same thread.                                                                                                                                                                                                |
| **Goals & feedback**                  | "List all of my performance goals (name, category, status, due or completion date) and every feedback entry I have received: for each, the author, the date, and the full text, not a summary. Say how many feedback entries exist in total."                                                                                                                            | Number of quoted entries = stated total.                                                                                                                              | "Please give the full text and date of each remaining feedback entry." same thread.                                                                                                                                                                                       |
| **Learning**                          | "List every learning assignment I currently have (required and assigned): title, due date, completion status, and whether it is overdue as of today."                                                                                                                                                                                                                    | Overdue flag per item.                                                                                                                                                | none                                                                                                                                                                                                                                                                      |
| **Inbox**                             | "How many open tasks are in my Workday inbox (My Tasks) right now? List them sorted by due date, earliest first, showing task name, type and due date, and mark the ones already overdue. If there are more than 20, give the 20 earliest and the total."                                                                                                                | Total present; order ascending.                                                                                                                                       | none (compute 'nearest due' locally from the list and say which reading you used).                                                                                                                                                                                        |
| **Requisitions & pipeline**           | "List the open job requisitions I am authorized to see, with the total count. For each, give the candidate count per recruiting stage. If the full list is too long, give the first 20 requisitions with their stage counts and state that the rest are not included."                                                                                                   | The reply states a total and which requisitions are covered. Partial-page warnings ("first 100 of N candidates") mean the counts are unreliable: do not present them. | "Please recompute the stage counts using all candidates for these N requisitions" on the same thread. Do not page further unless the employee asked for everything.                                                                                                       |
| **Direct reports' goals**             | "For each of my direct reports, list their performance goals (goal name, status, due date). List every direct report by name, and say explicitly if one has no goals on record."                                                                                                                                                                                         | Every report named.                                                                                                                                                   | none                                                                                                                                                                                                                                                                      |
| **Expense reports**                   | "List my 12 most recent expense reports grouped by report: report number, dates, total amount, approval status, and payment status exactly as recorded (paid, or no payment status recorded; do not infer). For the most recent report, also list each expense line with its amount. Say how many expense lines exist in total and that older reports are not included." | Per-report status; coverage stated; the most recent report's line items are listed and add to its total.                                                              | Ask for payment status only, for the reports missing it, on the same thread.                                                                                                                                                                                              |
| **Eligible leave & holidays**         | "Which time off and leave of absence types am I eligible for (list every type)? And which company holidays are on my holiday calendar between today and 90 days from now, with dates?"                                                                                                                                                                                   | Types listed; holiday list or an explicit 'none on file'.                                                                                                             | none. An empty holiday calendar is a data fact: report it as such, once.                                                                                                                                                                                                  |
| **Policy / knowledge base**           | "Search the HR knowledge base for the company expense reimbursement policy and the code of conduct. If either document is not in the knowledge base, say so and give me the Workday task or link where I can find it."                                                                                                                                                   | Either policy text or an explicit not-found plus a next step.                                                                                                         | none. **Budget: 1 turn.** Do not re-search; a repeat search has been refused as a privacy violation.                                                                                                                                                                      |
| **Pay what-if (401(k), withholding)** | "Show my most recent payslip: pay date, gross pay, each deduction with amount, taxes, and net pay. Also give me the Workday task or link where I can model a change to my 401(k) contribution."                                                                                                                                                                          | Payslip figures and a link.                                                                                                                                           | none. **Do not compute the hypothetical** and do not ask Workday to. Tell the employee that Workday's what-if tool models hourly wage changes only and that the exact figure comes from the benefits change task; give the current figures so they can see the direction. |
| **Pay date, elections, withholding**  | "When is my next pay date? List each of my payment elections (pay type, account, amount or percentage). And list my current federal and state tax withholding elections; if none are on file, say so explicitly."                                                                                                                                                        | Three sections, each answered or marked none.                                                                                                                         | none. An empty withholding record is an answer; do not re-query it.                                                                                                                                                                                                       |
| **Coworker lookup (T16 pattern)**     | "Is <name> one of my direct reports? If so, show her business title, work location, and hire date." For anyone not on the team: "Look up <name> in the worker directory and show the business title and work location."                                                                                                                                                  | Fields present.                                                                                                                                                       | Once, on a fresh thread: "Show the worker directory entry for <name>: business title and work location." Never state a reason for a refusal you were not given.                                                                                                           |
| **Time-off request (write)**          | `send_action`: "Set up a time off request for me: 8 hours of <time off type> on <weekday>, <date>. Show me the details for review and do not submit until I confirm." Use the type the employee named.                                                                                                                                                                   | Workday's confirmation text with type, date, hours.                                                                                                                   | none. **Stop at the confirmation and show its exact text.** Never send the confirming action unless the employee has confirmed in this conversation. If submit fails, show the error and ask the employee to choose another eligible type.                                |

### 4. Recovery rules

| Workday said                                                                                 | Do                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "I can not answer the question due to privacy/safety violation."                             | Exactly one recovery on a **fresh thread**: reframe by relationship ("Is X one of my direct reports? If so…"), split into narrower questions, or ask for aggregate counts only. If refused again, tell the employee which item Workday declined and that no reason was given. **Never invent the reason.** |
| `Internal error` (no run created)                                                            | Fresh thread, same or narrower question, once.                                                                                                                                                                                                                                                             |
| "within the steps available to me" / "approaching my tool-call budget" / "could you narrow"  | Fresh thread scoped explicitly (a named batch, a date range). One more turn at most.                                                                                                                                                                                                                       |
| "first 100 of N", "counts may not be complete", "approximate"                                | Do not present those numbers. Ask for a complete pass on the same thread, or report the coverage limit plainly.                                                                                                                                                                                            |
| A summary ("5 most recent", "older entries include…") when the employee asked for everything | Same thread: "Please list all N entries with date and text." Once.                                                                                                                                                                                                                                         |
| Two different figures for the same thing across turns                                        | Report the one that reconciles with its own line items, and tell the employee both were returned.                                                                                                                                                                                                          |
| A question back ("would you like me to…") that you can answer from the employee's request    | Answer it in the same thread; do not relay it to the employee.                                                                                                                                                                                                                                             |

### 5. Turn budget

- Target 1 turn. Hard cap 3 turns per request; 1 turn for not-found policy lookups; 2 turns for
  lists that came back summarized.
- Stop as soon as the check in §3 passes. Extra verification turns cost 30–60 s each and have not
  changed any answer.
- Never spend a turn re-confirming an empty result (no holidays, no tax elections, no KB document).
  Empty is an answer.

### 6. Answer contract (what the employee gets)

1. Lead with the answer. Then the data in a table or list when there are 3+ fields or 2+ rows.
2. Give the **as-of date** for balances, inbox, payslips. If Workday gave none, say "no as-of date
   returned".
3. State **coverage** whenever a list was cut: "20 of 153 requisitions", "12 of 40 reports", "most
   recent payslip on file is 09/30/2025".
4. Keep Workday task links Workday returned; the employee needs them. Strip thread ids, run ids and
   WIDs.
5. Label anything you computed yourself (day conversions, sums) as yours. Never present an estimate
   as a Workday figure.
6. When Workday refused or errored, say what was not obtained. Do not guess why.
7. For write intents, quote Workday's confirmation text and say clearly that nothing was submitted.

### 7. Known gateway behaviours these rules work around

- Two PTO balance tools: requesting "balance(s)" without an as-of date returns the plan balance with
  no date; requesting "as of today" with an explicit as-of date returns the available-today balance
  with a date. Neither response is labelled to distinguish them.
- The privacy classifier keys on phrasing, refuses with one fixed sentence, and gives no reason.
  Relationship-framed and aggregate-only phrasings pass.
- Long aggregates (pipeline, expenses) are computed from a first page and may be presented as
  complete; the agent will recompute on request.
- The 401(k) what-if is estimated by an LLM; figures differ between turns. There is no payroll
  simulation tool.
- Confirmation gates are plain text with status success. A time off type can be listed as eligible
  and still be rejected at submit. Show that error and ask the employee to choose another eligible
  type.
- Earlier runs on a thread cannot be re-polled once a newer run exists; keep your own copy of each
  response.
