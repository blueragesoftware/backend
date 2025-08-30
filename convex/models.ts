import { query } from "./_generated/server";
import { v } from "convex/values";
import * as Models from "./domains/models";

export const getDefault = query({
    handler: async (ctx) => {
        return await Models.getDefault(ctx.db);
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
        return await Models.getById(ctx.db, args.id);
    },
});