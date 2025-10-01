import { DatabaseReader, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getModelById, getDefaultModel } from "./models"
import { getCustomModelById } from "./customModels";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUserOrThrow } from "./users"
import { env } from "./env"
import { file } from "./schema";

const defaultImagesIds = env.DEFAULT_IMAGE_IDS.split(", ")

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

            const randomImageId = defaultImagesIds[Math.floor(Math.random() * defaultImagesIds.length)] as Id<"_storage">;
            const iconUrl = await ctx.storage.getUrl(randomImageId);

            if (iconUrl === null) {
                throw new ConvexError("Icon url could not be obtained");
            }

            const id = await ctx.db
                .insert("agents", {
                    name: "New Agent",
                    description: "Your new Agent",
                    iconUrl,
                    goal: "",
                    tools: [],
                    steps: [],
                    model: {
                        type: "model",
                        id: defaultModel._id
                    },
                    files: [],
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
        )),
        files: v.optional(v.array(file))
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
        if (args.files !== undefined) {
            const nextFiles = args.files;
            const nextFileIds = new Set(nextFiles.map((file) => file.storageId));
            const removedFiles = existing.files.filter((file) => !nextFileIds.has(file.storageId));

            if (removedFiles.length > 0) {
                await Promise.all(removedFiles.map((file) => ctx.storage.delete(file.storageId)));
            }

            updates.files = nextFiles;
        }

        return await ctx.db.patch(args.id, updates);
    }
});

export const removeByIds = mutation({
    args: {
        ids: v.array(v.id("agents"))
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        const agents = await Promise.all(
            args.ids.map(id => getAgentById(ctx.db, user._id, id))
        );

        const missingAgents = agents.some(agent => agent === null);

        if (missingAgents) {
            throw new ConvexError("Agent not found");
        }

        await Promise.all(
            agents.flatMap((agent) =>
                agent?.files.map((file) => ctx.storage.delete(file.storageId)) ?? []
            )
        );

        await Promise.all(
            args.ids.map(id => ctx.db.delete(id))
        );
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

    let modelUnion;

    switch (agent.model.type) {
        case "model":
            const model = await getModelById(db, agent.model.id);

            if (model === null) {
                return null;
            }

            modelUnion = {
                ...model,
                type: "model" as const
            }
            break;
        case "customModel":
            const customModel = await getCustomModelById(db, userId, agent.model.id);

            if (customModel === null) {
                return null;
            }

            modelUnion = {
                ...customModel,
                type: "customModel" as const
            }
            break;
        default:
            modelUnion = null;
    }

    if (modelUnion === null) {
        return null;
    }

    return {
        agent,
        model: modelUnion
    }
}
