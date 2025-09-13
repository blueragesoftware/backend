import { DatabaseReader, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { Doc, Id } from "./_generated/dataModel";
import { encryptApiKey, decryptApiKey } from "./encryption";

export type CustomModel = Doc<"customModels">;

export const create = mutation({
    handler: async (ctx) => {
        const user = await getCurrentUserOrThrow(ctx);

        const id = await ctx.db.insert("customModels", {
            userId: user._id,
            provider: "openai",
            modelId: "",
            name: "",
            encryptedApiKey: "",
            baseUrl: undefined
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
        encryptedApiKey: v.optional(v.string()),
        baseUrl: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        const existing = await getCustomModelById(ctx.db, user._id, args.id);

        if (existing === null) {
            throw new ConvexError("Custom model not found");
        }

        const updates: Partial<CustomModel> = {};

        if (args.name !== undefined) updates.name = args.name;
        if (args.provider !== undefined) updates.provider = args.provider;
        if (args.modelId !== undefined) updates.modelId = args.modelId;
        if (args.encryptedApiKey !== undefined) {
            updates.encryptedApiKey = encryptApiKey(args.encryptedApiKey);
        }
        if (args.baseUrl !== undefined) {
            updates.baseUrl = args.baseUrl === "" ? undefined : args.baseUrl;
        }

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

        const customModels = await Promise.all(
            args.id.map(id => getCustomModelById(ctx.db, user._id, id))
        );

        const missingModels = customModels.some(model => model === null);
        
        if (missingModels) {
            throw new ConvexError("Custom model not found");
        }

        await Promise.all(
            args.id.map(id => ctx.db.delete(id))
        );
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