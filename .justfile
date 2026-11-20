# Workflow targets for the Workday Claude Code plugin marketplace

# Install dependencies
setup:
    npm {{ if env("CI", "") != "" { "ci" } else { "install" } }}

# Format source files
tidy:
    npx prettier --write .

# Lint and typecheck
check:
    npx prettier --check .
    npx tsc --noEmit

# Run tests
test:
    npx vitest run --exclude ".worktrees/**"

# plugins/sana is one plugin in the standard layout, with one manifest at
# plugins/sana/.claude-plugin/plugin.json. Each host gets its own zip, named sana-<host>, which
# holds only the files that host reads. Any special handling is noted on that host's recipe.

# Package every host's zip into dist/
bundle: bundle-claude bundle-chatgpt

# Package the Claude plugin for Cowork's "Upload Plugin" flow
bundle-claude: (_bundle "sana-claude" ".claude-plugin .mcp.json skills logo.png")

# Package the ChatGPT plugin for "Upload plugin archive". ChatGPT rejects a zip that holds .mcp.json.
# The onboard skill is left out because it ships to Claude only. If more per-host differences like
# this come up, this approach may change.
bundle-chatgpt: (_bundle "sana-chatgpt" ".claude-plugin skills logo.png" "skills/workday-onboard/*")

# Zips the listed plugins/sana paths, leaving out anything that matches exclude.
[private]
_bundle name paths exclude="":
    #!/usr/bin/env bash
    set -euo pipefail
    manifest="plugins/sana/.claude-plugin/plugin.json"
    version=$(jq -r '.version // empty' "$manifest")
    if [ -z "$version" ]; then
        echo "error: no version found in $manifest" >&2
        exit 1
    fi
    mkdir -p dist
    out="$(pwd)/dist/{{name}}-${version}.zip"
    rm -f "$out"
    cd plugins/sana && zip -rX "$out" {{paths}} -x '*.DS_Store' {{ if exclude != "" { "'" + exclude + "'" } else { "" } }}

# Remove build artifacts
clean:
    rm -rf dist/

# Remove build artifacts and installed dependencies
clobber: clean
    rm -rf node_modules/
