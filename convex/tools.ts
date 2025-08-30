import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { DatabaseReader } from "./_generated/server";

type Tool = Doc<"tools">;

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
        return await getToolById(ctx.db, args.id);
    },
});

export async function getToolById(
    db: DatabaseReader,
    id: Id<"tools">
): Promise<Tool | null> {
    return await db.get(id);
}

export async function getToolsByIds(
    db: DatabaseReader,
    ids: Id<"tools">[]
): Promise<Tool[]> {
    const tools: Tool[] = [];
    
    for (const id of ids) {
        const tool = await getToolById(db, id);

        if (tool) {
            tools.push(tool);
        }
    }

    return tools;
}