import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { getCurrentUserOrThrow } from "./users"

export const updateTask = internalMutation({
    args: {
        id: v.id("tasks"),
        state: v.union(v.literal("registered"), v.literal("running"), v.literal("error"), v.literal("done")),
        result: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        const task = await ctx.db.get(args.id);

        if (task?.userId === user._id) {
            await ctx.db
                .patch(args.id, {
                    state: args.state,
                    result: args.result,
                    updatedAt: Date.now()
                });
        }

        throw new ConvexError("Task not found");
    }
});

export const create = mutation({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        const taskId = await ctx.db.insert("tasks", {
            agentId: args.id,
            result: undefined,
            state: "registered",
            updatedAt: Date.now(),
            userId: user._id
        });

        await ctx.scheduler.runAfter(0, internal.agents.runAgent, {
            taskId,
            agentId: args.id,
        });
    }
});