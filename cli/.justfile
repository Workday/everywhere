# Workflow targets for wdcli-plugin-everywhere

# Install dependencies
setup:
    npm {{ if env("CI", "") != "" { "ci" } else { "install" } }}

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

# Remove build artifacts
clean:
    rm -rf dist/

# Remove build artifacts and installed dependencies
clobber: clean
    rm -rf node_modules/
