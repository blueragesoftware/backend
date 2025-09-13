import { query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { decryptApiKey } from "./encryption";

export const get = query({
    handler: async (ctx) => {
        const user = await getCurrentUserOrThrow(ctx);

        const models = await ctx.db
            .query("models")
            .collect();

        const customModels = await ctx.db
            .query("customModels")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .collect();

        return {
            models,
            customModels
        };
    },
});