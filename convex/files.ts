import { mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users"

export const generateUploadUrl = mutation({
    handler: async (ctx) => {
        await getCurrentUserOrThrow(ctx);

        return await ctx.storage
            .generateUploadUrl();
    },
});

