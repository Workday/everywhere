# Sana Copilot — Cowork smoke

Small smoke suite for the sideloaded Teams/Cowork plugin in `plugins/sana-copilot`.

## Local runner

Default is **fresh** (new conversation per case — no resume id):

```bash
cd plugins/sana-copilot/evals
chmod +x run-smoke.sh
./run-smoke.sh
./run-smoke.sh --case connector-tools
```

If a fresh CLI session still lacks vault-bound tools, warm once in the Cowork UI and:

```bash
export COWORK_RESUME_CID='<taskId from cowork conversations list --server>'
./run-smoke.sh --resume
```

Results land in `results/smoke-<UTC>/` (`*.json` turn docs + `results.jsonl`).

## Dr. Eval dataset (optional)

`smoke.tsv` matches `cowork evals` columns. Upload when Dr. Eval auth works from this machine:

```bash
cowork evals datasets upload ./smoke.tsv
cowork evals submit --dataset <id> -m <model> --container-type copilot --identity-slot 0
```

Only use identity slots after each pooled eval account has been UI-warmed the same way. Validate
with one fresh `cowork send` as that identity first; if tools are still missing, prefer the local
`--resume` runner until the platform binds vault auth on new sessions.

## Cases

| id                     | What it checks                                            |
| ---------------------- | --------------------------------------------------------- |
| `connector-tools`      | Workday MCP tools are in the session catalog              |
| `ess-next-holiday`     | Correct holiday answer (may use session memory on resume) |
| `ess-manager`          | Manager lookup answer quality                             |
| `ess-july4`            | Holiday calendar answer quality                           |
| `ess-vacation-balance` | Time-off balance answer quality                           |
| `ess-live-refetch`     | Forces a new Workday tool call (not memory)               |

On a warmed `--resume` chat, ESS cases often answer from earlier turns with an empty `tool_trace`.
That is still a pass for answer-quality cases. Only `ess-live-refetch` requires a live
`mcp__sana-mcp-connector__*` call.
