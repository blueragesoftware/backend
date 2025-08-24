
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    agents: defineTable({
        name: v.string(),
        goal: v.string(),
        tools: v.array(v.string()),
        steps: v.string(),
        model: v.string()
    }).index("by_name", ["name"])
});