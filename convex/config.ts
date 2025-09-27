import { z } from 'zod';

const envSchema = z.object({
    // Convex
    CONVEX_SITE_URL: z.url().optional(),
    
    // Clerk
    CLERK_JWT_ISSUER_DOMAIN: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1),
    
    // Application
    DEFAULT_MODEL_ID: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DEFAULT_IMAGE_IDS: z.string().min(1),
    
    // AI Providers
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    XAI_API_KEY: z.string().min(1).optional(),
    
    // Composio
    COMPOSIO_API_KEY: z.string().min(1),
    COMPOSIO_WEBHOOK_SECRET: z.string().min(1),
    
    // Composio Auth Config IDs
    COMPOSIO_GMAIL_AUTH_CONFIG_ID: z.string().min(1),
    COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID: z.string().min(1),
    COMPOSIO_GITHUB_AUTH_CONFIG_ID: z.string().min(1),
    COMPOSIO_NOTION_AUTH_CONFIG_ID: z.string().min(1),
    COMPOSIO_LINEAR_AUTH_CONFIG_ID: z.string().min(1),
    COMPOSIO_YOUTUBE_AUTH_CONFIG_ID: z.string().min(1),
    COMPOSIO_DISCORD_AUTH_CONFIG_ID: z.string().min(1),
    COMPOSIO_GOOGLESHEETS_AUTH_CONFIG_ID: z.string().min(1),
    COMPOSIO_TELEGRAM_AUTH_CONFIG_ID: z.string().min(1),
    
    // PostHog
    POSTHOG_API_KEY: z.string().min(1),
    POSTHOG_HOST: z.url(),
});

function validateEnv() {
    const parsed = envSchema.safeParse(process.env);
    
    if (!parsed.success) {
        console.error('Environment verification failed: Missing or invalid environment variables:');
        console.error(parsed.error.issues.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n'));
        throw new Error('Invalid environment configuration');
    }
    
    return parsed.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;