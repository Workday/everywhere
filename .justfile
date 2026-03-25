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

# Run tests
test: build
    cd cli && just manifest
    cd examples && just setup
    npx vitest run

# Remove build artifacts
clean:
    rm -rf dist/

# Remove build artifacts and installed dependencies
clobber: clean
    rm -rf node_modules/
