import { DatabaseReader, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getModelById, getDefaultModel } from "./models"
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUserOrThrow } from "./users"

export type Agent = Doc<"agents">;

export const getById = query({
    args: {
        id: v.id("agents")
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        return await getAgentById(ctx.db, user._id, args.id);
    },
});

export const getAll = query({
    handler: async (ctx) => {
        const user = await getCurrentUserOrThrow(ctx);

        return await ctx.db
            .query("agents")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .order("asc")
            .collect();
    },
});

export const create = mutation({
    handler: async (ctx) => {
        try {
            const user = await getCurrentUserOrThrow(ctx);

            const defaultModel = await getDefaultModel(ctx.db);

            if (!defaultModel) {
                throw new ConvexError(`Default model not found`);
            }

            const id = await ctx.db
                .insert("agents", {
                    name: "New Agent",
                    description: "This is your new agent",
                    iconUrl: "",
                    goal: "",
                    tools: [],
                    steps: [],
                    modelId: defaultModel._id,
                    userId: user._id
                });

            return await getAgentById(ctx.db, user._id, id);
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
        tools: v.optional(v.array(v.object({
            slug: v.string(),
            name: v.string()
        }))),
        steps: v.optional(v.array(v.object({
            id: v.string(),
            value: v.string()
        }))),
        modelId: v.optional(v.id("models"))
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        const existing = await getAgentById(ctx.db, user._id, args.id);

        if (existing === null) {
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

export const removeByIds = mutation({
    args: {
        id: v.array(v.id("agents"))
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        for (const id of args.id) {
            const agent = await getAgentById(ctx.db, user._id, id);

            if (agent?.userId === user._id) {
                return await ctx.db
                    .delete(id)
            } else {
                throw new ConvexError("Agent not found");
            }
        }
    }
});

export const getByIdWithModel = query({
    args: {
        id: v.id("agents")
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        return await getAgentByIdWithModel(ctx.db, user._id, args.id);
    }
});

export async function getAgentById(
    db: DatabaseReader,
    userId: Id<"users">,
    id: Id<"agents">
) {
    const agent = await db.get(id);

    if (agent?.userId === userId) {
        return agent;
    }

    return null;
}

export async function getAgentByIdWithModel(
    db: DatabaseReader,
    userId: Id<"users">,
    id: Id<"agents">
) {
    const agent = await getAgentById(db, userId, id);

    if (!agent) {
        return null;
    }

    const model = await getModelById(db, agent.modelId)

    if (!model) {
        return null;
    }

    return {
        agent,
        model
    }
}