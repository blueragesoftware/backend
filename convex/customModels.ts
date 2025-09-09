import { DatabaseReader, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { model } from "./schema";
import { getCurrentUserOrThrow } from "./users";
import { Doc, Id } from "./_generated/dataModel";

export type CustomModel = Doc<"customModels">;

export const create = mutation({
    handler: async (ctx) => {
        const user = await getCurrentUserOrThrow(ctx);

        const id = await ctx.db.insert("customModels", {
            userId: user._id,
            provider: "openai",
            modelId: "",
            name: "",
            encryptedApiKey: ""
        });

        return await getCustomModelById(ctx.db, user._id, id);
    },
});

export const update = mutation({
    args: {
        id: v.id("customModels"),
        name: v.optional(v.string()),
        provider: v.optional(v.union(v.literal("openrouter"), v.literal("openai"), v.literal("anthropic"), v.literal("xai"))),
        modelId: v.optional(v.string()),
        encryptedApiKey: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        const existing = await getCustomModelById(ctx.db, user._id, args.id);

        if (existing === null) {
            throw new Error("Custom model not found");
        }

        const updates: Partial<CustomModel> = {};

        if (args.name !== undefined) updates.name = args.name;
        if (args.provider !== undefined) updates.provider = args.provider;
        if (args.modelId !== undefined) updates.modelId = args.modelId;
        if (args.encryptedApiKey !== undefined) updates.encryptedApiKey = args.encryptedApiKey;

        await ctx.db.patch(args.id, updates);

        return null;
    },
});

export const removeByIds = mutation({
    args: {
        id: v.array(v.id("customModels"))
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        for (const id of args.id) {
            const agent = await getCustomModelById(ctx.db, user._id, id);

            if (agent !== null) {
                return await ctx.db
                    .delete(id)
            } else {
                throw new ConvexError("Agent not found");
            }
        }
    }
});

export const getById = query({
    args: {
        id: v.id("customModels")
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        return await getCustomModelById(ctx.db, user._id, args.id);
    },
});

export const getAll = query({
    handler: async (ctx) => {
        const user = await getCurrentUserOrThrow(ctx);

        return await ctx.db
            .query("customModels")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .collect();
    },
});

export async function getCustomModelById(
    db: DatabaseReader,
    userId: Id<"users">,
    id: Id<"customModels">
) {
    const customModel = await db.get(id);

    if (customModel?.userId === userId) {
        return customModel;
    }

    return null;
}