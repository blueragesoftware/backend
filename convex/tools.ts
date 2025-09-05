"use node";

import { Composio } from '@composio/core';
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const SUPPORTED_TOOLKITS_WITH_AUTH_CONFIG_ID: Record<string, string> = {
    'GMAIL': process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID!,
    'GOOGLECALENDAR': process.env.COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID!,
    'GITHUB': process.env.COMPOSIO_GITHUB_AUTH_CONFIG_ID!,
    'NOTION': process.env.COMPOSIO_NOTION_AUTH_CONFIG_ID!,
};

export const getAll = action({
    handler: async (ctx) => {
        const user = await ctx.runQuery(internal.users.getCurrentOrThrow);

        const composio = new Composio();

        const connectedAccounts = await composio.connectedAccounts.list({
            userIds: [user._id],
        });

        const connectedToolkitMap = new Map<string, typeof connectedAccounts.items[number]>();
        connectedAccounts.items.forEach((account) => {
            connectedToolkitMap.set(account.toolkit.slug.toUpperCase(), account);
        });

        const toolkitPromises = Object.keys(SUPPORTED_TOOLKITS_WITH_AUTH_CONFIG_ID).map(async slug => {
            const toolkit = await composio.toolkits.get(slug);
            const item = connectedToolkitMap.get(slug.toUpperCase());

            return {
                authConfigId: SUPPORTED_TOOLKITS_WITH_AUTH_CONFIG_ID[slug],
                name: toolkit.name,
                slug: toolkit.slug,
                description: toolkit.meta?.description,
                logo: toolkit.meta?.logo,
                status: item?.status.toLowerCase() ?? 'INACTIVE'.toLowerCase()
            };
        });

        return await Promise.all(toolkitPromises);
    }
});

export const getBySlugsForUser = action({
    args: {
        slugs: v.array(v.string())
    },
    handler: async (ctx, args) => {
        const user = await ctx.runQuery(internal.users.getCurrentOrThrow);

        return await getToolsBySlugsForUserWithId(user._id, args.slugs);
    }
});

export const connectWithAuthConfigId = action({
    args: {
        authConfigId: v.string()
    },
    handler: async (ctx, args) => {
        const user = await ctx.runQuery(internal.users.getCurrentOrThrow);

        const composio = new Composio();

        const connectionRequest = await composio.connectedAccounts.initiate(
            user._id,
            args.authConfigId
        );

        return {
            id: connectionRequest.id,
            redirectUrl: connectionRequest.redirectUrl
        };
    }
});

export const checkConnection = action({
    args: {
        connectionId: v.string()
    },
    handler: async (ctx, args) => {
        await ctx.runQuery(internal.users.getCurrentOrThrow);

        const composio = new Composio();

        const connection = await composio.connectedAccounts.waitForConnection(args.connectionId);

        return {
            id: connection.id,
            status: connection.status
        };
    }
});

export async function getToolsBySlugsForUserWithId(
    userId: Id<"users">,
    slugs: string[]
) {
    if (slugs.length === 0) {
        return [];
    }

    const supportedToolkitSlugs = slugs.filter(slug => SUPPORTED_TOOLKITS_WITH_AUTH_CONFIG_ID[slug.toUpperCase()] !== undefined);

    const composio = new Composio();

    const toolkits = await composio.connectedAccounts.list({
        userIds: [userId],
        toolkitSlugs: supportedToolkitSlugs
    });

    const toolkitPromises = toolkits.items.map(async item => {
        const toolkit = await composio.toolkits.get(item.toolkit.slug);

        return {
            authConfigId: SUPPORTED_TOOLKITS_WITH_AUTH_CONFIG_ID[toolkit.slug.toUpperCase()],
            name: toolkit.name,
            slug: toolkit.slug,
            description: toolkit.meta?.description,
            logo: toolkit.meta?.logo,
            status: item.status.toLowerCase()
        };
    });

    return await Promise.all(toolkitPromises);
}