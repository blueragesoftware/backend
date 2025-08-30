import { Doc, Id } from "../_generated/dataModel";
import { DatabaseReader } from "../_generated/server";

export type Tool = Doc<"tools">;

export async function getById(
    db: DatabaseReader,
    id: Id<"tools">
): Promise<Tool | null> {
    return await db.get(id);
}

export async function getByIds(
    db: DatabaseReader,
    ids: Id<"tools">[]
): Promise<Tool[]> {
    const tools: Tool[] = [];
    for (const id of ids) {
        const tool = await getById(db, id);
        if (tool) {
            tools.push(tool);
        }
    }
    return tools;
}