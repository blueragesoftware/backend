# AgentOS Backend

A Convex-powered backend service for managing and executing AI agents.

## Prerequisites

- Node.js 18+ and pnpm
- Convex account

## Installation

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/AgentOSS/backend
cd backend
pnpm install
```

## Environment Setup

1. Create a `.env.local` file from the example:

```bash
cp .env.example .env.local
```

2. Configure your environment variables in `.env.local` with the required API keys and Convex configuration.

## Local Development

1. Run the development server:

```bash
npx convex dev
```

This starts the Convex development server with hot reloading enabled, watching for changes in your functions.

## Project Structure

```
convex/
├── agents.ts        # Agent CRUD operations and execution
├── schema.ts        # Database schema definitions
└── _generated/      # Auto-generated Convex files
```

## API Overview

The backend provides the following Convex functions:

### Queries
- `getById` - Retrieve a specific agent by ID
- `getAll` - List all agents

### Mutations
- `create` - Create a new agent
- `update` - Update an existing agent
- `remove` - Delete an agent

### Actions
- `runAgent` - Execute an agent with its configured settings

## Scripts

- `npx convex dev` - Start local development server
- `npx convex deploy` - Deploy to production
- `npx convex logs` - View deployment logs
- `npx convex dashboard` - Open the Convex dashboard

## Configuration

### Convex Configuration

The project uses Convex for backend infrastructure. Configuration is managed through:
- Database schema in `convex/schema.ts`
- Function definitions in `convex/` directory
- Environment variables for API keys and external services

## Troubleshooting

### Local Development Issues

1. Clear Convex cache and reinitialize:
   ```bash
   rm -rf .convex
   npx convex dev --once
   ```

2. Verify environment variables are correctly set in `.env.local`

3. Check Convex dashboard for deployment status and logs

### Connection Issues

1. Ensure you're logged in to Convex:
   ```bash
   npx convex login
   ```

2. Verify your Convex project is properly configured

3. Check network connectivity to Convex services

## Support

For issues or questions:

1. Check the [Convex documentation](https://docs.convex.dev/)
2. Review existing issues in the repository
3. Open a new issue with detailed information

## License

Apache License 2.0