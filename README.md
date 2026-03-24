# Workday Everywhere SDK

Core libraries and framework for building Workday Everywhere platform integrations.

## Getting Started

### 1. Create a plugin

Create a new directory for your Workday Everywhere plugin and install the SDK:

```sh
mkdir my-plugin && cd my-plugin
npm init -y
npm install @workday/everywhere
```

Define your plugin in a `plugin.ts` file:

```typescript
import { plugin } from '@workday/everywhere';

export default plugin({
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My first Workday Everywhere plugin.',
});
```

### 2. Verify

From your plugin directory, run:

```sh
npx @workday/everywhere info
```

## Contributing

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [just](https://github.com/casey/just) command runner

### Getting Started

```sh
git clone git@github.com:Workday/everywhere.git
cd everywhere/sdk
just setup
```

### Development Workflow

| Command      | Description          |
| ------------ | -------------------- |
| `just setup` | Install dependencies |
| `just check` | Typecheck and lint   |
| `just test`  | Run tests            |
| `just tidy`  | Format source files  |
