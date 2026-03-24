# Workflow targets for Workday Everywhere SDK

# Install dependencies
setup:
    npm install

# Format source files
tidy:
    npx prettier --write src/ '**/*.md'

# Lint and typecheck
check:
    npx tsc --noEmit
    npx eslint src/

# Build package to dist/
build: setup
    npx tsc -p tsconfig.build.json

# Run tests (placeholder until test runner chosen)
test:
    @echo "TODO: configure test runner"

# Remove build artifacts
clean:
    rm -rf dist/

# Remove build artifacts and installed dependencies
clobber: clean
    rm -rf node_modules/
