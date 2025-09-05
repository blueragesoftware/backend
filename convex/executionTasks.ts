import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { getCurrentUserOrThrow } from "./users"
import { getAgentByIdWithModel } from "./agents"

export const getAllByAgentId = query({
    args: {
        agentId: v.id("agents")
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        return await ctx.db
            .query("executionTasks")
            .withIndex("by_agentId_and_userId", (q) =>
                q
                    .eq("agentId", args.agentId)
                    .eq("agent.userId", user._id)
            )
            .order("desc")
            .collect()
    }
});

export const getById = query({
    args: {
        id: v.id("executionTasks"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .get(args.id);
    }
});

export const updateTask = internalMutation({
    args: {
        id: v.id("executionTasks"),
        state: v.union(
            v.object({ type: v.literal("registered") }),
            v.object({ type: v.literal("running") }),
            v.object({ type: v.literal("error"), error: v.string() }),
            v.object({ type: v.literal("success"), result: v.string() })
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            state: args.state,
            updatedAt: Date.now()
        });
    }
});

export const create = mutation({
    args: {
        agentId: v.id("agents")
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        const response = await getAgentByIdWithModel(ctx.db, user._id, args.agentId);

        if (response === null) {
            throw new ConvexError("Agent not found");
        }

        const taskId = await ctx.db.insert("executionTasks", {
            agentId: response.agent._id,
            agent: response.agent,
            model: response.model,
            state: { type: "registered" },
            updatedAt: Date.now()
        });

        await ctx.scheduler.runAfter(0, internal.executeAgent.executeWithId, {
            taskId
        });
    }
});