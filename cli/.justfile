# Workflow targets for wdcli-plugin-everywhere

import '../common.just'

# Build to dist/
build: setup
    npx tsc
    cp src/viewer/index.html src/viewer/viewer.css src/viewer/empty-plugin-styles.css dist/viewer/
    npx oclif manifest

# Run static checks
check:
    npx tsc --noEmit

# Run tests
test:
    npx vitest run
