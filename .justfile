# Workflow targets for Workday Everywhere SDK

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
    npx eslint src/

# Build package to dist/
build:
    npx tsc -p tsconfig.build.json
    cd cli && just build

# Run tests
test: build
    cd examples && just setup
    npx vitest run

# Verify no uncommitted changes to tracked files
release-guard:
    #!/usr/bin/env bash
    branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$branch" != "main" ]; then
        echo "error: releases must be created from main (currently on '$branch')"
        exit 1
    fi
    test -z "$(git status --porcelain -uno)" || (echo "error: working tree is dirty"; exit 1)

# Bump version, commit, tag, and push (CI handles npm publish)
release bump="patch": release-guard check test
    #!/usr/bin/env bash
    npm version {{bump}} --no-git-tag-version
    VERSION=$(jq -r '.version' package.json)
    npx prettier --write package.json package-lock.json
    git add package.json package-lock.json
    git commit -m "release v$VERSION"
    git tag -a "v$VERSION" -m "v$VERSION"
    git push && git push --tags

# Remove build artifacts
clean:
    rm -rf dist/

# Remove build artifacts and installed dependencies
clobber: clean
    rm -rf node_modules/
