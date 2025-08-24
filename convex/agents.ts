import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { agentFetch } from "agents/client"

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
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .insert("agents", { name: "Empty agent", goal: "", tools: [], steps: "", model: "" })
    }
});

export const update = mutation({
    args: {
        id: v.id("agents"),
        name: v.optional(v.string()),
        goal: v.optional(v.string()),
        tools: v.optional(v.array(v.string())),
        steps: v.string(),
        model: v.string()
    },
    handler: async (ctx, args) => {
        const agent = await ctx.db.get(args.id);

        if (!agent) {
            throw new Error("Agent not found");
        }

        const patchedAgent = {
            name: args.name ?? agent.name,
            goal: args.goal ?? agent.goal,
            tools: args.tools ?? agent.tools,
            steps: args.steps ?? agent.steps,
            model: args.model ?? agent.model
        }

        return await ctx.db
            .patch(args.id, patchedAgent)
    }
});

export const remove = mutation({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        return await ctx.db
            .delete(args.id)
    }
});

export const runAgent = action({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        const agent = await ctx.runQuery(api.agents.getById, { id: args.id });

        if (!agent) {
            throw new Error("Agent not found");
        }

        const requestBody = {
            goal: agent.goal,
            steps: agent.steps,
            tools: agent.tools,
            model: agent.model
        }

        console.log(requestBody)

        try {
            const result = await agentFetch(
                {
                    agent: "steps-following-agent",
                    name: "single-instance",
                    host: "https://agent-worker.bluerage-software.workers.dev"
                },
                {
                    method: "POST",
                    body: JSON.stringify(requestBody)
                }
            );

            const json = await result.json();

            if (result.ok) {
                return {
                    data: json.data
                }
            } else {
                console.log(`Agent execution failed: ${json.error}`)

                throw new Error("Agent execution failed");
            }
        } catch (error) {
            console.log(`Agent execution failed: ${error}`)

            throw new Error("Error executing agent");
        }
    }
})