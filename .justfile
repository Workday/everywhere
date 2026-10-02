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

# Package one plugin into a zip for Cowork's "Upload Plugin" flow (e.g. `just bundle-plugin sana`)
bundle-plugin plugin:
    #!/usr/bin/env bash
    set -euo pipefail
    dir="plugins/{{ plugin }}"
    manifest="$dir/.claude-plugin/plugin.json"
    if [ ! -f "$manifest" ]; then
        echo "error: no plugin manifest at $manifest" >&2
        exit 1
    fi
    version=$(jq -r '.version // empty' "$manifest")
    if [ -z "$version" ]; then
        echo "error: no version found in $manifest" >&2
        exit 1
    fi
    mkdir -p dist
    out="$(pwd)/dist/{{ plugin }}-plugin-${version}.zip"
    rm -f "$out"
    cd "$dir"
    zip -rX "$out" . -x '*.DS_Store'

# Remove build artifacts
clean:
    rm -rf dist/

# Remove build artifacts and installed dependencies
clobber: clean
    rm -rf node_modules/
