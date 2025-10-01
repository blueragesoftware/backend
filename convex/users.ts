import { internalMutation, internalQuery, QueryCtx } from "./_generated/server";
import type { DatabaseReader } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { user as userSchema } from "./schema";

export const getById = internalQuery({
    args: {
        id: v.id("users")
    },
    async handler(ctx, args) {
        return await ctx.db.get(args.id);
    },
});

export const upsertFromClerk = internalMutation({
    args: userSchema,
    async handler(ctx, args) {
        const existing = await userByExternalId(ctx.db, args.externalId);

        if (existing === null) {
            await ctx.db.insert("users", args);
        } else {
            await ctx.db.patch(existing._id, args);
        }
    },
});

export const deleteFromClerk = internalMutation({
    args: {
        clerkUserId: v.string()
    },
    async handler(ctx, { clerkUserId }) {
        const user = await userByExternalId(ctx.db, clerkUserId);

        if (user == null) {
            console.warn(`Can't delete user, there is none for Clerk user ID: ${clerkUserId}`);

            return;
        }

        const agents = await ctx.db
            .query("agents")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .collect();

        await ctx.runMutation(api.agents.removeByIds, {
            ids: agents.map((agent) => agent._id)
        });

        const executionTasks = await ctx.db
            .query("executionTasks")
            .withIndex("by_userId", (q) => q.eq("agent.userId", user._id))
            .collect();

        for (const task of executionTasks) {
            await ctx.db.delete(task._id);
        }

        const customModels = await ctx.db
            .query("customModels")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .collect();

        for (const model of customModels) {
            await ctx.db.delete(model._id);
        }

        await ctx.db.delete(user._id);
    },
});

export const getByExternalId = internalQuery({
    args: {
        externalId: v.string(),
    },
    handler: async (ctx, { externalId }) => {
        return await userByExternalId(ctx.db, externalId);
    },
});

export const getCurrentOrThrow = internalQuery({
    handler: async (ctx) => {
        return await getCurrentUserOrThrow(ctx);
    },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
    const userRecord = await getCurrentUser(ctx);

    if (!userRecord) {
        throw new ConvexError("Can't get current user");
    }

    return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
        return null;
    }

    return await userByExternalId(ctx.db, identity.subject);
}

async function userByExternalId(db: DatabaseReader, externalId: string) {
    return await db
        .query("users")
        .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
        .unique();
}