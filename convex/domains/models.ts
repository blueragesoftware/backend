import { Doc, Id } from "../_generated/dataModel";
import { DatabaseReader } from "../_generated/server";

// Claude sonnet 4
export const DEFAULT_MODEL_ID = "jh7f257x5wp924q3t2cczzgg8d7pg14c" as Id<"models">;

export type Model = Doc<"models">;

export async function getById(
    db: DatabaseReader,
    id: Id<"models">
): Promise<Model | null> {
    return await db.get(id);
}

export async function getDefault(
    db: DatabaseReader
): Promise<Model | null> {
    return await getById(db, DEFAULT_MODEL_ID);
}