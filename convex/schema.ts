import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const model = v.object({
    name: v.string(),
    provider: v.union(v.literal("openrouter"), v.literal("openai"), v.literal("anthropic"), v.literal("xai")),
    modelId: v.string(),
});

export const customModel = v.object({
    name: v.string(),
    provider: v.union(v.literal("openrouter"), v.literal("openai"), v.literal("anthropic"), v.literal("xai")),
    modelId: v.string(),
    userId: v.string(),
    encryptedApiKey: v.string()
});

export const agent = v.object({
    name: v.string(),
    description: v.string(),
    iconUrl: v.string(),
    goal: v.string(),
    tools: v.array(v.object({
        slug: v.string(),
        name: v.string()
    })),
    steps: v.array(v.object({
        id: v.string(),
        value: v.string()
    })),
    model: v.union(
        v.object({
            type: v.literal("model"),
            id: v.id("models")
        }),
        v.object({
            type: v.literal("customModel"),
            id: v.id("customModels")
        })
    ),
    userId: v.id("users"),
});

export const executionTask = v.object({
    agentId: v.id("agents"),
    agent: v.object({
        ...agent.fields,
        _id: v.id("agents"),
        _creationTime: v.number()
    }),
    model: v.union(
        v.object({
            type: v.literal("model"),
            id: v.id("models"),
            data: v.object({
                ...model.fields,
                _id: v.id("models"),
                _creationTime: v.number()
            })
        }),
        v.object({
            type: v.literal("customModel"),
            id: v.id("customModels"),
            data: v.object({
                ...customModel.fields,
                _id: v.id("customModels"),
                _creationTime: v.number()
            })
        })
    ),
    state: v.union(
        v.object({ type: v.literal("registered") }),
        v.object({ type: v.literal("running") }),
        v.object({ type: v.literal("error"), error: v.string() }),
        v.object({ type: v.literal("success"), result: v.string() })
    ),
    updatedAt: v.number(),
});

export default defineSchema({
    agents: defineTable(agent)
        .index("by_name", ["name"])
        .index("by_userId", ["userId"]),
    executionTasks: defineTable(executionTask)
        .index("by_agentId_and_userId", ["agentId", "agent.userId"])
        .index("by_userId", ["agent.userId"]),
    models: defineTable(model)
        .index("by_name", ["name"]),
    users: defineTable({
        name: v.string(),
        externalId: v.string(),
    }).index("byExternalId", ["externalId"]),
    customModels: defineTable(customModel)
        .index("by_userId", ["userId"])
});