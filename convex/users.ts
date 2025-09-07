import { internalMutation, internalQuery, QueryCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

export const upsertFromClerk = internalMutation({
    args: {
        data: v.any() as Validator<UserJSON>
    },
    async handler(ctx, { data }) {
        const userAttributes = {
            name: `${data.first_name} ${data.last_name}`,
            externalId: data.id,
        };

        const user = await userByExternalId(ctx, data.id);

        if (user === null) {
            await ctx.db.insert("users", userAttributes);
        } else {
            await ctx.db.patch(user._id, userAttributes);
        }
    },
});

export const deleteFromClerk = internalMutation({
    args: {
        clerkUserId: v.string()
    },
    async handler(ctx, { clerkUserId }) {
        const user = await userByExternalId(ctx, clerkUserId);

        if (user == null) {
            console.warn(`Can't delete user, there is none for Clerk user ID: ${clerkUserId}`);

            return;
        }

        const agents = await ctx.db
            .query("agents")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .collect();
        
        for (const agent of agents) {
            await ctx.db.delete(agent._id);
        }

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

export const getCurrentOrThrow = internalQuery({
    handler: async (ctx) => {
        return await getCurrentUserOrThrow(ctx);
    },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
    const userRecord = await getCurrentUser(ctx);

    if (!userRecord) {
        throw new Error("Can't get current user");
    }

    return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
        return null;
    }

    return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
    return await ctx.db
        .query("users")
        .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
        .unique();
}