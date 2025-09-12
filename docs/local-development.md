# Local Development Guide

This guide covers how to setup the Bluerage backend service for local development.

## Environment Variables Reference

<details>
<summary>Expand to see</summary>

### Convex

- `CONVEX_DEPLOYMENT`: Your Convex deployment ID (obtained from Convex dashboard after creating a project)
- `CONVEX_URL`: Your Convex deployment URL (automatically generated when you create a deployment)

**How to obtain**:
1. Create a new project at [Convex Dashboard](https://dashboard.convex.dev/)
2. Copy your deployment ID and URL to the environment variables

### Clerk

- `CLERK_JWT_ISSUER_DOMAIN`: Your Clerk JWT issuer domain (found in Clerk dashboard under JWT Templates)
- `CLERK_WEBHOOK_SECRET`: Secret for validating Clerk webhooks (generated in Clerk dashboard under Webhooks)

**How to obtain**:
1. Follow the [Convex + Clerk tutorial](https://docs.convex.dev/auth/clerk)
2. Set up your JWT issuer domain and webhook secret

### Application

- `DEFAULT_MODEL_ID`: Default AI model ID to use (references the models table - get this from your seeded models)
- `ENCRYPTION_KEY`: Master key for encrypting custom model API keys (generate a secure random string)
- `DEFAULT_IMAGE_IDS`: Comma-separated list of storage IDs for default agent icons

**How to obtain**:
1. Seed your database with models and note the default model ID
2. Generate a secure random string for encryption
3. Upload default images to Convex storage and note the storage IDs

### AI Providers

- `OPENROUTER_API_KEY`: API key for OpenRouter service
- `XAI_API_KEY`: API key for xAI/Grok models

**How to obtain**:
1. Sign up at [OpenRouter](https://openrouter.ai/) for access to multiple AI models
2. Sign up at [x.ai](https://x.ai/) for Grok models

### Composio

- `COMPOSIO_API_KEY`: Your Composio API key
- `COMPOSIO_WEBHOOK_SECRET`: Secret for validating Composio webhooks

**How to obtain**:
1. Sign up at [Composio](https://composio.dev/)
2. Get your API key and webhook secret from the dashboard

### Composio Auth Config IDs

- `COMPOSIO_GMAIL_AUTH_CONFIG_ID`: Gmail integration auth config
- `COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID`: Google Calendar integration auth config
- `COMPOSIO_GITHUB_AUTH_CONFIG_ID`: GitHub integration auth config
- `COMPOSIO_NOTION_AUTH_CONFIG_ID`: Notion integration auth config
- `COMPOSIO_LINEAR_AUTH_CONFIG_ID`: Linear integration auth config
- `COMPOSIO_YOUTUBE_AUTH_CONFIG_ID`: YouTube integration auth config
- `COMPOSIO_DISCORD_AUTH_CONFIG_ID`: Discord integration auth config
- `COMPOSIO_GOOGLESHEETS_AUTH_CONFIG_ID`: Google Sheets integration auth config

**How to obtain**:
1. Set up each integration in your Composio dashboard
2. Copy the auth config IDs for each tool you want to integrate

### PostHog

- `POSTHOG_API_KEY`: Your PostHog project API key
- `POSTHOG_HOST`: PostHog instance URL (usually `https://app.posthog.com` or `https://us.i.posthog.com`)

**How to obtain**:
1. Sign up at [PostHog](https://posthog.com/)
2. Create a new project and copy your API key to `POSTHOG_API_KEY`
3. Set the appropriate host URL for your region in `POSTHOG_HOST`

</details>

## Setup Instructions

### 1. Setup Environment Variables

Create a `.env.local` file from the example:

```bash
cp .env.example .env.local
```

Fill in all the required environment variables using the reference above.

### 2. Install Dependencies and Run

```bash
pnpm install

npx convex dev
```

### 3. You're ready to go!

Your Convex backend will be running and ready to serve requests from the iOS app.
