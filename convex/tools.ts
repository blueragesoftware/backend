import { query } from "./_generated/server";
import { v } from "convex/values";
import * as Tools from "./domains/tools";

export const getAll = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("tools")
            .collect();
    }
});

export const getById = query({
    args: { id: v.id("tools") },
    handler: async (ctx, args) => {
        return await Tools.getById(ctx.db, args.id);
    },
});