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

# Run tests (placeholder until test runner chosen)
test:
    @echo "TODO: configure test runner"
