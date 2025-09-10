# Self-Hosting Guide

This guide covers how to self-host the AgentOS backend service.

## Environment Variables Reference

### Convex - Backend Database and Functions

- `CONVEX_DEPLOYMENT`: Your Convex deployment ID (obtained from Convex dashboard
  after creating a project)
- `CONVEX_URL`: Your Convex deployment URL (automatically generated when you
  create a deployment)

### Clerk - Authentication Service

- `CLERK_JWT_ISSUER_DOMAIN`: Your Clerk JWT issuer domain (found in Clerk
  dashboard under JWT Templates)
- `CLERK_WEBHOOK_SECRET`: Secret for validating Clerk webhooks (generated in
  Clerk dashboard under Webhooks)

### Application Settings

- `DEFAULT_MODEL_ID`: Default AI model ID to use (references the models table -
  get this from your seeded models)
- `ENCRYPTION_KEY`: Master key for encrypting custom model API keys (generate a
  secure random string)

### AI Providers

- `OPENROUTER_API_KEY`: API key for OpenRouter service (sign up at
  https://openrouter.ai/)
- `XAI_API_KEY`: API key for xAI/Grok models (sign up at https://x.ai/)

### Composio - Tool Integration Platform

- `COMPOSIO_API_KEY`: Your Composio API key (sign up at https://composio.dev/)
- `COMPOSIO_WEBHOOK_SECRET`: Secret for validating Composio webhooks (generated
  in Composio dashboard)

### Composio Auth Config IDs - Tool-specific Authentication

These are obtained from your Composio dashboard after setting up each
integration:

- `COMPOSIO_GMAIL_AUTH_CONFIG_ID`: Gmail integration auth config
- `COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID`: Google Calendar integration auth
  config
- `COMPOSIO_GITHUB_AUTH_CONFIG_ID`: GitHub integration auth config
- `COMPOSIO_NOTION_AUTH_CONFIG_ID`: Notion integration auth config
- `COMPOSIO_BROWSER_TOOL_AUTH_CONFIG_ID`: Browser automation tool auth config
  (optional)

### PostHog - Analytics and Tracking

- `POSTHOG_API_KEY`: Your PostHog project API key (sign up at
  https://posthog.com/)
- `POSTHOG_HOST`: PostHog instance URL (usually `https://app.posthog.com` or
  `https://us.i.posthog.com`)

## Setup Instructions

### 1. Convex Setup

1. Create a new project at [Convex Dashboard](https://dashboard.convex.dev/)
2. Copy your deployment ID and URL to the environment variables

### 2. Clerk Authentication Setup

1. Follow the [Convex + Clerk tutorial](https://docs.convex.dev/auth/clerk)
2. Set up your JWT issuer domain and webhook secret

### 3. PostHog Analytics Setup

1. Sign up at [PostHog](https://posthog.com/)
2. Create a new project and copy your API key
3. Use the appropriate host URL for your region

### 4. Composio Tool Integration Setup

1. Sign up at [Composio](https://composio.dev/)
2. Get your API key from the dashboard
3. Set up auth configs for each tool you want to integrate:
   - Gmail
   - Google Calendar
   - GitHub
   - Notion
   - Browser automation (optional)

### 5. AI Provider Setup

Set up API keys for the AI providers you want to use:

- **OpenRouter**: Sign up at [OpenRouter](https://openrouter.ai/) for access to
  multiple AI models
- **xAI**: Sign up at [x.ai](https://x.ai/) for Grok models

### 6. Run

```bash
pnpm install

npx convex dev
```

## Security Considerations

- Keep all API keys secure and never commit them to version control
- Use strong, randomly generated encryption keys
- Regularly rotate your API keys
- Set up proper access controls in your service dashboards
- Consider using environment-specific deployments (dev, staging, prod)
