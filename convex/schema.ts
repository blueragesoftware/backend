
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const agent = v.object({
    name: v.string(),
    description: v.string(),
    iconUrl: v.string(),
    goal: v.string(),
    tools: v.array(v.string()),
    steps: v.array(v.string()),
    model: v.string()
});

export const task = v.object({
    agentId: v.id("agents"),
    state: v.union(v.literal("registered"), v.literal("running"), v.literal("error"), v.literal("done")),
    result: v.optional(v.string()),
    updatedAt: v.number()
});

export default defineSchema({
    agents: defineTable(agent)
        .index("by_name", ["name"]),
    tasks: defineTable(task)
        .index("by_agent", ["agentId"])
});