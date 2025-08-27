import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel"
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { agentFetch } from "agents/client"

export type Agent = Doc<"agents">

export const getById = query({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        return await ctx.db
            .get(args.id)
    },
});

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("agents")
            .withIndex("by_name")
            .order("asc")
            .collect();
    },
});

export const create = mutation({
    handler: async (ctx) => {
        return await ctx.db
            .insert("agents", {
                name: "New Agent",
                description: "This is your new agent",
                iconUrl: "",
                goal: "",
                tools: [],
                steps: [],
                model: ""
            })
    }
});

export const update = mutation({
    args: {
        id: v.id("agents"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        iconUrl: v.optional(v.string()),
        goal: v.optional(v.string()),
        tools: v.optional(v.array(v.string())),
        steps: v.optional(v.array(v.string())),
        model: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);

        if (!existing) {
            throw new ConvexError("Agent not found");
        }

        const updates: Partial<Agent> = {};

        if (args.name !== undefined) updates.name = args.name;
        if (args.description !== undefined) updates.description = args.description;
        if (args.iconUrl !== undefined) updates.iconUrl = args.iconUrl;
        if (args.goal !== undefined) updates.goal = args.goal;
        if (args.tools !== undefined) updates.tools = args.tools;
        if (args.steps !== undefined) updates.steps = args.steps;
        if (args.model !== undefined) updates.model = args.model;

        return await ctx.db.patch(args.id, updates);
    }
});

export const remove = mutation({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        return await ctx.db
            .delete(args.id)
    }
});

export const runAgent = internalAction({
    args: { taskId: v.id("tasks"), agentId: v.id("agents"), },
    handler: async (ctx, args) => {
        try {
            const agent = await ctx.runQuery(api.agents.getById, { id: args.agentId });

            if (!agent) {
                throw new ConvexError("Agent not found");
            }

            const requestBody = {
                goal: agent.goal,
                steps: agent.steps,
                tools: agent.tools,
                model: agent.model
            }

            try {
                const result = await agentFetch(
                    {
                        agent: "steps-following-agent",
                        name: `single-instance-${args}`,
                        host: "https://agent-worker.bluerage-software.workers.dev"
                    },
                    {
                        method: "POST",
                        body: JSON.stringify(requestBody)
                    }
                );

                const json = await result.json();

                if (result.ok) {
                    await ctx.runMutation(internal.tasks.updateTask, { id: args.taskId, state: "error", result: json.data ?? "Successful execution with no data returned" })
                } else {
                    console.log(`Agent execution failed: ${json.error}`)

                    throw new ConvexError("Agent execution failed");
                }
            } catch (error) {
                console.log(`Agent execution failed: ${error}`)

                throw new ConvexError("Error executing agent");
            }
        } catch (error) {
            await ctx.runMutation(internal.tasks.updateTask, { id: args.taskId, state: "error", result: JSON.stringify(error) })
            throw error;
        }
    }
});

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