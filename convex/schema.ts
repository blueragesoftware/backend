
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const agent = v.object({
    name: v.string(),
    description: v.string(),
    iconUrl: v.string(),
    goal: v.string(),
    tools: v.array(v.id("tools")),
    steps: v.array(v.object({
        id: v.string(),
        value: v.string()
    })),
    modelId: v.id("models"),
    userId: v.id("users"),
});

export const task = v.object({
    agentId: v.id("agents"),
    state: v.union(v.literal("registered"), v.literal("running"), v.literal("error"), v.literal("done")),
    result: v.optional(v.string()),
    updatedAt: v.number(),
    userId: v.id("users"),
});

export const model = v.object({
    name: v.string(),
    provider: v.union(v.literal("openrouter")),
    model: v.string()
});

export const tool = v.object({
    name: v.string()
});

export default defineSchema({
    agents: defineTable(agent)
        .index("by_name", ["name"])
        .index("by_userId", ["userId"]),
    tasks: defineTable(task)
        .index("by_agent", ["agentId"])
        .index("by_userId", ["userId"]),
    models: defineTable(model)
        .index("by_name", ["name"]),
    tools: defineTable(tool)
        .index("by_name", ["name"]),
    users: defineTable({
        name: v.string(),
        externalId: v.string(),
    }).index("byExternalId", ["externalId"]),
});