#!/usr/bin/env bash
# Local Cowork smoke for the sideloaded Sana Copilot plugin.
#
# Default: each case is a NEW conversation (no resume).
#
#   ./run-smoke.sh
#   ./run-smoke.sh --case connector-tools
#
# Optional: resume a UI-warmed conversation (avoids answering from empty tool
# catalog when CLI vault bind is broken):
#
#   export COWORK_RESUME_CID='69574136-…:…:319470a7-…'
#   ./run-smoke.sh --resume
#
# Options:
#   --resume    Use COWORK_RESUME_CID for every case (required if set this way)
#   --case ID   Run a single case id from cases.json
#   --timeout N Per-turn seconds (default 300)
#   --out DIR   Results directory
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CASES="${ROOT}/cases.json"
OUT_DIR="${ROOT}/results/smoke-$(date -u +%Y%m%dT%H%M%SZ)"
TIMEOUT=300
ONLY_CASE=""
MODE="fresh"
CONTAINER_TYPE="${COWORK_CONTAINER_TYPE:-copilot}"

while [[ $# -gt 0 ]]; do
	case "$1" in
		\#*)
			# zsh (default) does not treat "#" as a comment on interactive lines
			break
			;;
		--fresh)
			MODE="fresh"
			shift
			;;
		--resume)
			MODE="resume"
			shift
			;;
		--case) ONLY_CASE="${2:?}"; shift 2 ;;
		--timeout) TIMEOUT="${2:?}"; shift 2 ;;
		--out) OUT_DIR="${2:?}"; shift 2 ;;
		-h | --help)
			awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
			exit 0
			;;
		*)
			echo "Unknown argument: $1" >&2
			exit 2
			;;
	esac
done

# Allow env to opt into resume without the flag.
if [[ "${MODE}" == "fresh" && -n "${COWORK_RESUME_CID:-}" && "${COWORK_FORCE_FRESH:-}" != "1" ]]; then
	# Keep default fresh unless user asked for resume; ignore leftover env.
	:
fi

if [[ "${MODE}" == "resume" && -z "${COWORK_RESUME_CID:-}" ]]; then
	echo " --resume needs COWORK_RESUME_CID (UI-warmed conversation id)." >&2
	echo "  cowork conversations list --server" >&2
	exit 2
fi

command -v cowork >/dev/null || {
	echo "cowork CLI not on PATH" >&2
	exit 2
}
command -v python3 >/dev/null || {
	echo "python3 required" >&2
	exit 2
}

mkdir -p "${OUT_DIR}"
echo "-> ${OUT_DIR}"
echo "mode: ${MODE}"
if [[ "${MODE}" == "resume" ]]; then
	echo "resume: ${COWORK_RESUME_CID}"
fi

run_case() {
	local id="$1" prompt="$2" mode="$3"
	local json="${OUT_DIR}/${id}.${mode}.json"
	local err="${OUT_DIR}/${id}.${mode}.err"
	local args=(send --json --container-type "${CONTAINER_TYPE}" --timeout "${TIMEOUT}" --no-progress)
	if [[ "${mode}" == "resume" ]]; then
		args+=(--resume "${COWORK_RESUME_CID}")
	fi
	echo "==> ${id} (${mode})"
	set +e
	cowork "${args[@]}" "${prompt}" >"${json}" 2>"${err}"
	set -e
	python3 - "${json}" "${id}" "${CASES}" "${mode}" "${OUT_DIR}/results.jsonl" <<'PY'
import json, re, sys
from pathlib import Path

doc_path, case_id, cases_path, mode, results_path = sys.argv[1:6]
cases = {c["id"]: c for c in json.loads(Path(cases_path).read_text())}
case = cases[case_id]
doc = json.loads(Path(doc_path).read_text())
text = doc.get("text") or ""
trace = doc.get("tool_trace") or []
tool_names = [t.get("tool_name") or "" for t in trace if isinstance(t, dict)]
blob = json.dumps(doc)

failures = []
if doc.get("terminal_status") != "ok":
    failures.append(f"terminal_status={doc.get('terminal_status')!r}")

needles = case.get("expect_tools_any") or []
if needles and not any(n in blob for n in needles):
    failures.append(f"missing any of tool mentions: {needles}")

for pat in case.get("expect_response_patterns") or []:
    if not re.search(pat, text):
        failures.append(f"response pattern not matched: {pat}")

for pat in case.get("forbid_response_patterns") or []:
    if re.search(pat, text):
        failures.append(f"forbidden pattern matched: {pat}")

# On fresh sessions, ESS cases should hit Workday (no prior memory). Enforce
# a workday tool call whenever require_workday_tool_call is set, or when mode
# is fresh and the case opts in via require_workday_tool_call_on_fresh.
require_call = case.get("require_workday_tool_call")
if mode == "fresh" and case.get("require_workday_tool_call_on_fresh"):
    require_call = True
if require_call:
    wd = [
        n
        for n in tool_names
        if "workday" in n.lower() or "sana-mcp" in n.lower() or "send_query" in n.lower()
    ]
    if not wd:
        failures.append(f"no workday tool in tool_trace={tool_names!r}")

ok = not failures
row = {
    "id": case_id,
    "mode": mode,
    "ok": ok,
    "failures": failures,
    "terminal_status": doc.get("terminal_status"),
    "tool_names": tool_names,
    "text_preview": text[:400].replace("\n", " "),
}
with open(results_path, "a", encoding="utf-8") as f:
    f.write(json.dumps(row) + "\n")
print("PASS" if ok else "FAIL", case_id, mode)
for fmsg in failures:
    print("  -", fmsg)
if text:
    print("  text:", text[:240].replace("\n", " "))
sys.exit(0 if ok else 1)
PY
	return $?
}

PASS=0
FAIL=0
while IFS= read -r id; do
	[[ -z "${id}" ]] && continue
	[[ -n "${ONLY_CASE}" && "${id}" != "${ONLY_CASE}" ]] && continue
	prompt="$(python3 -c 'import json,sys; print(next(c["prompt"] for c in json.load(open(sys.argv[1])) if c["id"]==sys.argv[2]))' "${CASES}" "${id}")"
	if run_case "${id}" "${prompt}" "${MODE}"; then
		PASS=$((PASS + 1))
	else
		FAIL=$((FAIL + 1))
	fi
done < <(python3 -c 'import json,sys; print("\n".join(c["id"] for c in json.load(open(sys.argv[1]))))' "${CASES}")

echo
echo "summary: pass=${PASS} fail=${FAIL} mode=${MODE} out=${OUT_DIR}"
[[ "${FAIL}" -eq 0 ]]
