"use node";

import { Agent, run } from "@openai/agents";
import { Composio } from '@composio/core';
import { OpenAIAgentsProvider } from '@composio/openai-agents';
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { aisdk, AiSdkModel } from '@openai/agents-extensions';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { internalAction } from './_generated/server';
import { ConvexError, v } from "convex/values";
import { api, internal } from './_generated/api';
import { decryptCustomKey } from "./models";
import { getToolsBySlugsForUserWithId } from "./tools"
import { PostHog } from "posthog-node";
import { withTracing } from "@posthog/ai"
import { LanguageModel } from "ai";

export const executeWithId = internalAction({
    args: {
        taskId: v.id("executionTasks"),
    },
    handler: async (ctx, args) => {
        try {
            const task = await ctx.runQuery(api.executionTasks.getById, {
                id: args.taskId
            });

            if (task === null) {
                throw new ConvexError("Task not found");
            }

            const composio = new Composio({
                provider: new OpenAIAgentsProvider({
                    strict: true
                })
            });

            const requestedToolSlugs = task.agent.tools.map(tool => tool.slug);

            const userAvailableRequestedTools = await getToolsBySlugsForUserWithId(task.agent.userId, requestedToolSlugs);

            const tools = await composio.tools.get(task.agent.userId, {
                toolkits: requestedToolSlugs
            });

            // Verify all requested tools are available
            const requestedSet = new Set<string>(requestedToolSlugs);
            const availableSet = new Set<string>(userAvailableRequestedTools.map(tool => tool.slug));

            const missingTools = [...requestedSet].filter(slug => !availableSet.has(slug));

            if (missingTools.length > 0) {
                throw new ConvexError(`Tools missing authentication: ${missingTools.join(', ')}`);
            }

            let model: LanguageModel;

            switch (task.model.provider) {
                case "openrouter":
                    const decryptedOpenRouterKey = await decryptCustomKey(task.model.encryptedCustomApiKey || null);
                    const openrouter = createOpenRouter(decryptedOpenRouterKey ? { apiKey: decryptedOpenRouterKey } : {});

                    model = openrouter.chat(task.model.modelId);
                    break;
                case "openai":
                    const decryptedOpenAIKey = await decryptCustomKey(task.model.encryptedCustomApiKey || null);
                    const openai = createOpenAI(decryptedOpenAIKey ? { apiKey: decryptedOpenAIKey } : {});

                    model = openai.chat(task.model.modelId);
                    break;
                case "anthropic":
                    const decryptedAnthropicKey = await decryptCustomKey(task.model.encryptedCustomApiKey || null);
                    const anthropic = createAnthropic(decryptedAnthropicKey ? { apiKey: decryptedAnthropicKey } : {});

                    model = anthropic.chat(task.model.modelId);
                    break;
                default:
                    throw new ConvexError("Invalid model provider");
            }

            const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
                host: process.env.POSTHOG_HOST!
            });

            const modelWithTracing = withTracing(model, posthog, {
                posthogDistinctId: task.agent.userId,
            });

            const aiSdkModel = aisdk(modelWithTracing);

            const goal = task.agent.goal;

            const agent = new Agent({
                instructions: `You are an ai agent that executes user defined steps in a given order using tools provided alongside.\nYour goal is: ${goal}.\nCurrent date is: ${new Date().toLocaleDateString()}.`,
                name: "StepsFollowingAgent",
                tools,
                model: aiSdkModel
            });

            const formattedSteps = task.agent.steps.map((step, index) => `${index + 1}. ${step.value}`).join('\n');

            await ctx.runMutation(internal.executionTasks.updateTask, {
                id: args.taskId,
                state: { type: "running" }
            });

            const result = await run(
                agent,
                `Execute these steps: \n${formattedSteps}`
            );

            await ctx.runMutation(internal.executionTasks.updateTask, {
                id: args.taskId,
                state: { type: "success", result: result.finalOutput ?? "No result" }
            });
        } catch (error) {
            console.error("Error executing agent", error);

            await ctx.runMutation(internal.executionTasks.updateTask, {
                id: args.taskId,
                state: { type: "error", error: (error as Error).message }
            });
        }
    }
});

