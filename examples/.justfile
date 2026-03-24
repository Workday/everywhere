# Workflow targets for Workday Everywhere example plugins

# Format example source files
tidy:
    npx prettier --write .

# Typecheck example plugins
check:
    npx tsc --noEmit -p tsconfig.json
