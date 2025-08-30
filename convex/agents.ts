import { internal } from "./_generated/api";
import { DatabaseReader, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { agentFetch } from "agents/client";
import { getModelById, getDefaultModel } from "./models"
import { getToolsByIds} from "./tools";
import { Doc, Id } from "./_generated/dataModel";

export type Agent = Doc<"agents">;

export const getById = query({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        return await getAgentById(ctx.db, args.id);
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
        try {
            const defaultModel = await getDefaultModel(ctx.db);

            if (!defaultModel) {
                throw new ConvexError(`Default model is not found`);
            }

            const id = await ctx.db
                .insert("agents", {
                    name: "New Agent",
                    description: "This is your new agent",
                    iconUrl: "",
                    goal: "",
                    tools: [],
                    steps: [],
                    modelId: defaultModel._id
                });

            return await getAgentById(ctx.db, id);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
});

export const update = mutation({
    args: {
        id: v.id("agents"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        iconUrl: v.optional(v.string()),
        goal: v.optional(v.string()),
        tools: v.optional(v.array(v.id("tools"))),
        steps: v.optional(v.array(v.object({
            id: v.string(),
            value: v.string()
        }))),
        modelId: v.optional(v.id("models"))
    },
    handler: async (ctx, args) => {
        const existing = await getAgentById(ctx.db, args.id);

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
        if (args.modelId !== undefined) updates.modelId = args.modelId;

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

export const getByIdWithModelAndTools = internalQuery({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        const agent = await getAgentById(ctx.db, args.id);

        if (!agent) {
            return null;
        }

        const model = await getModelById(ctx.db, agent.modelId)

        if (!model) {
            return null;
        }

        const tools = await getToolsByIds(ctx.db, agent.tools);

        return {
            agent: agent,
            model: model,
            tools: tools
        }
    }
});

export const runAgent = internalAction({
    args: { taskId: v.id("tasks"), agentId: v.id("agents"), },
    handler: async (ctx, args) => {
        try {
            const result = await ctx.runQuery(internal.agents.getByIdWithModelAndTools, { id: args.agentId });

            if (!result) {
                throw new ConvexError("Agent not found");
            }

            const agent = result.agent;
            const model = result.model;

            const requestBody = {
                goal: agent.goal,
                steps: agent.steps,
                tools: agent.tools,
                providerId: model.provider,
                modelId: model.model
            }

            await ctx.runMutation(internal.tasks.updateTask, {
                id: args.taskId,
                state: "running"
            })

            try {
                const result = await agentFetch(
                    {
                        agent: "steps-following-agent",
                        name: `single-instance-${args.taskId}`,
                        host: "https://agent-worker.bluerage-software.workers.dev"
                    },
                    {
                        method: "POST",
                        body: JSON.stringify(requestBody)
                    }
                );

                const json = await result.json();

                if (result.ok) {
                    await ctx.runMutation(internal.tasks.updateTask, {
                        id: args.taskId,
                        state: "error",
                        result: json.data ?? "Successful execution with no data returned"
                    })
                } else {
                    console.log(`Agent execution failed: ${json.error}`)

                    throw new ConvexError("Agent execution failed");
                }
            } catch (error) {
                console.log(`Agent execution failed: ${error}`)

                throw new ConvexError("Error executing agent");
            }
        } catch (error) {
            await ctx.runMutation(internal.tasks.updateTask, {
                id: args.taskId,
                state: "error",
                result: JSON.stringify(error)
            })

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

async function getAgentById(
    db: DatabaseReader,
    id: Id<"agents">
): Promise<Agent | null> {
    return await db.get(id);
}