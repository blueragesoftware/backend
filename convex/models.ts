import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { DatabaseReader } from "./_generated/server";

const DEFAULT_MODEL_ID = "jh7f257x5wp924q3t2cczzgg8d7pg14c" as Id<"models">;

type Model = Doc<"models">;

export const getDefault = query({
    handler: async (ctx) => {
        return await getDefaultModel(ctx.db);
    }
});

export const getAll = query({
    handler: async (ctx) => {
        return ctx.db
            .query("models")
            .collect();
    }
});

export const getById = query({
    args: { id: v.id("models") },
    handler: async (ctx, args) => {
        return await getModelById(ctx.db, args.id);
    },
});

export async function getModelById(
    db: DatabaseReader,
    id: Id<"models">
): Promise<Model | null> {
    return await db.get(id);
}

export async function getDefaultModel(
    db: DatabaseReader
): Promise<Model | null> {
    return await getModelById(db, DEFAULT_MODEL_ID);
}