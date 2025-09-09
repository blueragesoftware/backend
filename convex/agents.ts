import { DatabaseReader, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getModelById, getDefaultModel } from "./models"
import { getCustomModelById } from "./customModels";
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
                    model: {
                        type: "model",
                        id: defaultModel._id
                    },
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
        model: v.optional(v.union(
            v.object({
                type: v.literal("model"),
                id: v.id("models")
            }),
            v.object({
                type: v.literal("customModel"),
                id: v.id("customModels")
            })
        ))
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
        if (args.model !== undefined) updates.model = args.model;

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

            if (agent !== null) {
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

    if (agent === null) {
        return null;
    }

    let model;

    switch (agent.model.type) {
        case "model":
            model = await getModelById(db, agent.model.id);
            break;
        case "customModel":
            model = await getCustomModelById(db, userId, agent.model.id);
            break;
        default:
            model = null;
    }

    if (model === null) {
        return null;
    }

    const modelUnion = {
        type: agent.model.type,
        ...model
    }

    return {
        agent,
        model: modelUnion
    }
}