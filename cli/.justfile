# Workflow targets for wdcli-plugin-everywhere

# Install dependencies
setup:
    npm {{ if env("CI", "") != "" { "ci" } else { "install" } }}

# Build to dist/
build: setup
    npx tsc

# Run static checks
check:
    npx tsc --noEmit

# Run tests
test:
    npx vitest run

# Generate oclif manifest
manifest: build
    npx oclif manifest

# Remove build artifacts
clean:
    rm -rf dist/

# Remove build artifacts and installed dependencies
clobber: clean
    rm -rf node_modules/
