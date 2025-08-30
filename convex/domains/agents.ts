import { Doc, Id } from "../_generated/dataModel";
import { DatabaseReader } from "../_generated/server";

export type Agent = Doc<"agents">;

export async function getById(
    db: DatabaseReader,
    id: Id<"agents">
): Promise<Agent | null> {
    return await db.get(id);
}