import { DatabaseReader, internalMutation, mutation, query } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { getCurrentUserOrThrow } from "./users"
import { getAgentByIdWithModel } from "./agents"
import { Workpool } from "@convex-dev/workpool"
import { Id } from "./_generated/dataModel"

const agentsWorkpool = new Workpool(components.agentsWorkpool, {
    maxParallelism: 10,
});

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
        const user = await getCurrentUserOrThrow(ctx);

        return await getExecutionTaskById(ctx.db, user._id, args.id);
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

        const task = await getExecutionTaskById(ctx.db, user._id, taskId);

        if (task == null) {
            return null;
        }

        await agentsWorkpool.enqueueAction(ctx, internal.executeAgent.executeWithId, {
            task
        });
    }
});

export async function getExecutionTaskById(
    db: DatabaseReader,
    userId: Id<"users">,
    id: Id<"executionTasks">
) {
    const task = await db.get(id);

    if (task === null) {
        return null;
    }

    if (task.agent.userId !== userId) {
        return null;
    }

    return task;
}