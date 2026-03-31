# Workflow targets for Workday Everywhere example plugins

# Install example plugin dependencies
setup:
    cd hello && npm install
    cd directory && npm install

# Format example source files
tidy:
    npx prettier --write .

# Typecheck example plugins
check:
    npx tsc --noEmit -p tsconfig.json

# Preview an example plugin in the browser
view plugin:
    node ../bin/everywhere.js view -D {{plugin}}

# Package an example plugin into a distributable bundle
build plugin:
    cd {{plugin}} && npx everywhere build
