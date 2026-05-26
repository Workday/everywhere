# Create a Work Event - Workday Everywhere Plugin

This example demonstrates how to build a feature-rich Workday Everywhere plugin using the Workday
Everywhere SDK. The **Create a Work Event** plugin enables employees to discover, register for,
create, and manage company work events directly within their Workday experience.

This plugin is based on the popular
[Create a Work Event Workday Marketplace App](https://marketplace.workday.com/en-US/apps/425531/create-a-work-event).

## Features

The Create a Work Event plugin provides comprehensive event management capabilities:

### 📋 Browse & Discover Events

- **Browse all events** - View a catalog of upcoming company events
- **Filter by event type** - Discover events by category including:
  - Potlucks & social meals
  - Happy hours & networking
  - Team building activities
  - Workshops & training
  - Outings & adventures
  - General social events
- **Event details view** - See comprehensive information about each event including location,
  sponsor, and contact information

### 📝 Event Registration Demo

- **Demo register button** - Try the in-app registration experience from the event detail page
- **View registrations** - See the example registration list on the "Registered Events" page
- **Registration confirmation** - The current UI confirms the action locally in the example

### ➕ Create New Events

- **Event creation form** - Create new work events with:
  - Event name and description
  - Location and start/end dates
  - Sponsor and contact information
  - Cost information
  - Internal-only flag for private events
- **Event review** - Review event details before publishing
- **Data persistence** - Events are automatically saved to your Workday tenant

### 🎯 Manage Events

- **View your events** - See all events you've created
- **Event management** - Manage registrations and event details
- **Calendar view** - Visual representation of upcoming events

### 🔐 Security & Access Control

The plugin leverages Workday security domains to ensure proper access control:

- `RegisterForEvents` - Allows employees to register for events
- `ManageCreateAnEvent` - Enables event creation and management capabilities

## Screenshots

### Landing Page & Navigation

The plugin starts with an intuitive dashboard showing quick access to all major features.

!["Landing Page"](./Screen%20Shots/Plugin%20Screenshots/Plugin%20Landing%20Screen.png)

### Browse & Filter Events

Explore all available events in a clean, card-based layout with filtering capabilities.

!["Browse Events"](./Screen%20Shots/Plugin%20Screenshots/Viewing%20Event%20Details.png)

### Event Details & Registration

View event details and register with a simple, streamlined interface.

!["Event Registration"](./Screen%20Shots/Plugin%20Screenshots/Viewing%20Event%20Details.png)

### Create New Events

Create new work events with a comprehensive form covering all event details.

!["Create Event"](./Screen%20Shots/Plugin%20Screenshots/Create%20a%20New%20Event.png)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Workday tenant with access to the Extend business objects
- The Workday Everywhere SDK installed

### 1. Set Up the SDK

If you haven't already installed the Workday Everywhere SDK globally, you can use it via npx:

```sh
npx @workday/everywhere --version
```

### 2. Authenticate with Your Workday Tenant

Before you can preview or publish the plugin, you need to authenticate with your Workday tenant:

```sh
npx @workday/everywhere auth login
```

You'll be prompted to enter:

- **API Gateway Hostname** - The Workday Cloud Platform API Gateway host.
- **Access Token** - The User Access Token

Your credentials are stored securely in `~/.config/@workday/everywhere/config.json` and are
automatically injected by the CLI.

To verify your login status:

```sh
npx @workday/everywhere auth status
```

### 3. Install Dependencies

Navigate to the example directory and install dependencies:

```sh
cd examples/create-work-event
npm install
```

### 4. Preview the Plugin Locally

Launch a local development server with hot reloading to preview the plugin in your browser:

```sh
npx @workday/everywhere view
```

This starts a Vite development server at `http://localhost:4242` with:

- Live preview of your plugin
- Hot module reloading (changes appear instantly)
- Full integration with your Workday tenant's data

The plugin will automatically connect to your Workday tenant and fetch real event data from your
Extend business objects.

### 5. Build the Plugin

Once you're satisfied with the plugin, package it for distribution:

```sh
npx @workday/everywhere build
```

This generates a distributable zip file at `dist/create-work-event-<version>.zip` containing:

- `package.json` - Plugin metadata
- `plugin.js` - Bundled plugin code
- `plugin.css` - Styled components (if present)
- Static assets - All images and other resources, with content-addressed hashes

### 6. Publish to Workday Marketplace

To make your plugin available to others:

1. **Package the plugin** - Run `npx @workday/everywhere build`
2. **Sign in to Workday** - Go to the Workday Marketplace portal
3. **Upload the plugin** - Submit the `.zip` file created in the `dist/` directory
4. **Complete metadata** - Add a description, icon, and other marketplace details
5. **Submit for review** - Submit your plugin for security and functionality review

Once approved, your plugin will be available on the Workday Marketplace for other organizations to
discover and install.

## Project Structure

```
create-work-event/
├── plugin.tsx                 # Main plugin entry point
├── routes.ts                  # Route definitions for all pages
├── package.json               # Project metadata and dependencies
├── pages/
│   ├── Home.tsx              # Landing page with navigation
│   ├── BrowseEvents.tsx       # Event discovery and filtering
│   ├── EventDetail.tsx        # Individual event details
│   ├── MyEvents.tsx           # Event list showing registrations
│   ├── CreateEvent.tsx        # Event creation form
│   └── ManageEvents.tsx       # Event management interface
├── everywhere/
│   └── data/
│       ├── schema.ts          # Auto-generated GraphQL schemas
│       ├── models.ts          # TypeScript type definitions
│       ├── WorkEvent.ts       # Work event data model
│       ├── Registrant.ts      # Event registration data
│       ├── EventImage.ts      # Event images
│       ├── AttachedFile.ts    # Event attachments
│       └── index.ts           # Data hooks and queries
└── Screen Shots/              # UI mockups and screenshots
```

## Key Components

### Plugin Entry Point (`plugin.tsx`)

The plugin uses a `GraphQLResolver` to connect to Workday's GraphQL API and manages data through a
`DataProvider`:

```typescript
const resolver = new GraphQLResolver('createAWorkEventNjjhnta_wtmhcd', schemas);

function WorkEventProvider({ children }) {
  return <DataProvider resolver={resolver}>{children}</DataProvider>;
}

export default plugin({
  provider: WorkEventProvider,
  defaultRoute: home,
  routes: [home, browseEvents, eventDetail, myEvents, createEvent, manageEvents],
});
```

### Data Integration

The plugin uses the Workday Everywhere SDK's data layer to:

- **Query events** - Fetch work events from your Workday tenant using GraphQL
- **Register for events** - Create registrant records when users sign up
- **Create events** - Persist new events to the Extend business objects
- **Manage registrations** - Update and retrieve registration data

Data models are automatically generated from your Extend business objects using the
`everywhere bind` command, ensuring type safety and consistency.

### Navigation

Routes are defined using the SDK's `route()` function, which enables:

- Type-safe route parameters (e.g., `eventId`)
- Deep linking to specific pages
- Seamless navigation using `useNavigate()` hook
- URL-based state management

## Development Workflow

### Edit & Preview

Make changes to `.tsx` files in the `pages/` directory. Your browser will automatically refresh with
hot module replacement.

### Test Data

Events and registrations are stored in your actual Workday tenant. You can create test events
through the plugin's create event form.

### Lint & Format

Follow the repository's linting and formatting standards:

```sh
# From the root of the Workday Everywhere SDK repository
just check      # Type check and lint
just tidy       # Format code
```

### Build & Verify

Before publishing:

```sh
npm run build   # Verify the build succeeds
npm run test    # Run any tests (if applicable)
```

## Common Tasks

### Add a New Page

1. Create a new component in `pages/NewPage.tsx`
2. Export a route in `routes.ts`:
   ```typescript
   export const newPage = route('new-page', { component: NewPageComponent });
   ```
3. Add it to the routes array in `plugin.tsx`:
   ```typescript
   routes: [..., newPage]
   ```
4. Navigate to it using `navigate(newPage)`

### Connect to New Data Models

1. Define Extend business objects in your Workday tenant
2. Run `npx @workday/everywhere bind` to generate schemas
3. Import schemas in `plugin.tsx` and add to the GraphQL resolver
4. Use data hooks to query and mutate data

### Customize Styling

The plugin uses inline styles for maximum portability. Modify component styles in the `.tsx` files
or create a `plugin.css` file for shared styles (which will be bundled automatically).

## Troubleshooting

### Plugin doesn't load

- Verify your Workday credentials with `npx @workday/everywhere auth status`
- Check that your API token hasn't expired
- Ensure the API gateway hostname is correct

### Events not displaying

- Verify you have access to the `ManageCreateAnEvent` and `RegisterForEvents` security domains
- Check that work events exist in your Workday tenant
- Look for error messages in the browser console (F12 Developer Tools)

### Build fails

- Ensure all dependencies are installed: `npm install`
- Run `npx tsc --noEmit` to check for TypeScript errors
- Check that all imports use `.js` file extensions

## Resources

- [Workday Everywhere SDK Documentation](../../docs/)
- [Workday Marketplace](https://marketplace.workday.com)
- [Create a Work Event - Original Marketplace App](https://marketplace.workday.com/en-US/apps/425531/create-a-work-event)
