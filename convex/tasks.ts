import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const updateTask = internalMutation({
    args: {
        id: v.id("tasks"),
        state: v.union(v.literal("registered"), v.literal("running"), v.literal("error"), v.literal("done")),
        result: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db
            .patch(args.id, {
                state: args.state,
                result: args.result,
                updatedAt: Date.now()
            });
    }
});

export const create = mutation({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        const taskId = await ctx.db.insert("tasks", {
            agentId: args.id,
            result: undefined,
            state: "registered",
            updatedAt: Date.now()
        });

        await ctx.scheduler.runAfter(0, internal.agents.runAgent, {
            taskId,
            agentId: args.id,
        });
    }
});