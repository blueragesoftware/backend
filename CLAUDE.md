# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a Convex backend service that manages AI agents. The architecture consists of:

- **Convex Functions**: All backend logic lives in the `convex/` directory as serverless functions
- **Database Schema**: Defined in `convex/schema.ts` with an `agents` table storing agent configurations
- **Agent Integration**: Communicates with an external agent worker service at `https://agent-worker.bluerage-software.workers.dev`

## Key Components

### Database Operations (`convex/agents.ts`)
- **Queries**: `getById`, `getAll` - Read agent data
- **Mutations**: `create`, `update`, `remove` - Modify agent records
- **Actions**: `runAgent` - Executes agents via external worker service using the `agents` npm package

### Agent Model
Agents have the following properties:
- `name`: Display name
- `goal`: Agent's objective
- `tools`: Array of toolkit names
- `steps`: Execution instructions
- `model`: AI model identifier

## Development Commands

```bash
# Start local development server with hot reload
npx convex dev

# Deploy to production
npx convex deploy

# View logs
npx convex logs

# Open Convex dashboard
npx convex dashboard

# Run a specific function manually
npx convex run agents:getAll

# Export data
npx convex export

# Set environment variables
npx convex env set KEY value
```

## Environment Configuration

Required environment variables in `.env.local`:
- `CONVEX_DEPLOYMENT`: Your Convex deployment ID
- `CONVEX_URL`: Your Convex URL

## Important Patterns

1. **Function Types**: Use Convex's `query`, `mutation`, and `action` wrappers appropriately:
   - `query`: Read-only database operations
   - `mutation`: Database writes
   - `action`: External API calls or side effects

2. **Error Handling**: The `runAgent` action includes try-catch blocks for external API failures

3. **Type Safety**: Uses Convex's `v` validator for runtime type checking of function arguments

4. **Agent Execution Flow**:
   - Fetch agent configuration from database
   - Send request to external worker service
   - Return structured response or throw descriptive errors