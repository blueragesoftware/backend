"use node";

import { Agent, run } from "@openai/agents";
import { Composio } from '@composio/core';
import { OpenAIAgentsProvider } from '@composio/openai-agents';
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { aisdk } from '@openai/agents-extensions';
import { createOpenAI, OpenAIProviderSettings } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { internalAction } from './_generated/server';
import { ConvexError, v } from "convex/values";
import { internal } from './_generated/api';
import { decryptApiKey } from "./encryption";
import { getToolsBySlugsForUserWithId } from "./tools"
import { PostHog } from "posthog-node";
import { withTracing } from "@posthog/ai"
import { createXai } from "@ai-sdk/xai"
import { executionTask } from "./schema"
import { env } from "./config"

export const executeWithId = internalAction({
    args: {
        task: v.object({
            _id: v.id("executionTasks"),
            _creationTime: v.number(),
            ...executionTask.fields
        }),
    },
    handler: async (ctx, args) => {
        const posthog = new PostHog(env.POSTHOG_API_KEY, {
            host: env.POSTHOG_HOST
        });

        try {
            const task = args.task;

            const composio = new Composio({
                provider: new OpenAIAgentsProvider({
                    strict: true
                })
            });

            let tools;

            const requestedToolSlugs = task.agent.tools.map(tool => tool.slug);

            if (requestedToolSlugs.length === 0) {
                tools = undefined;
            } else {
                const userAvailableRequestedTools = await getToolsBySlugsForUserWithId(task.agent.userId, requestedToolSlugs);

                const requestedSet = new Set<string>(requestedToolSlugs);
                const availableSet = new Set<string>(userAvailableRequestedTools.map(tool => tool.slug));

                const missingTools = [...requestedSet].filter(slug => !availableSet.has(slug));

                if (missingTools.length > 0) {
                    throw new ConvexError(`Tools missing authentication: ${missingTools.join(', ')}`);
                }

                tools = await composio.tools.get(task.agent.userId, {
                    toolkits: requestedToolSlugs
                });
            }

            let modelId: string;
            let provider: "openrouter" | "openai" | "anthropic" | "xai";
            let encryptedApiKey: string | undefined;
            let baseUrl: string | undefined;

            switch (task.model.type) {
                case "model":
                    modelId = task.model.modelId;
                    provider = task.model.provider;
                    encryptedApiKey = undefined;
                    baseUrl = undefined;
                    break;
                case "customModel":
                    modelId = task.model.modelId;
                    provider = task.model.provider;
                    encryptedApiKey = task.model.encryptedApiKey;
                    baseUrl = task.model.baseUrl;
                    break;
                default:
                    throw new ConvexError("Invalid model type");
            }

            let model;

            switch (provider) {
                case "openrouter":
                    const decryptedOpenRouterKey = encryptedApiKey ? decryptApiKey(encryptedApiKey) : null;
                    const openrouter = createOpenRouter(decryptedOpenRouterKey ? { apiKey: decryptedOpenRouterKey } : {});

                    model = openrouter(modelId);
                    break;
                case "openai":
                    const decryptedOpenAIKey = encryptedApiKey ? decryptApiKey(encryptedApiKey) : null;
                    const openaiConfig: OpenAIProviderSettings = {};

                    if (decryptedOpenAIKey) {
                        openaiConfig.apiKey = decryptedOpenAIKey;
                    }

                    if (baseUrl) {
                        openaiConfig.baseURL = baseUrl;
                    }

                    const openai = createOpenAI(openaiConfig);

                    model = openai(modelId);
                    break;
                case "anthropic":
                    const decryptedAnthropicKey = encryptedApiKey ? decryptApiKey(encryptedApiKey) : null;
                    const anthropic = createAnthropic(decryptedAnthropicKey ? { apiKey: decryptedAnthropicKey } : {});

                    model = anthropic(modelId);
                    break;
                case "xai":
                    const decryptedXaiKey = encryptedApiKey ? decryptApiKey(encryptedApiKey) : null;
                    const xai = createXai(decryptedXaiKey ? { apiKey: decryptedXaiKey } : {});

                    model = xai(modelId);
                    break;
                default:
                    throw new ConvexError("Invalid model provider");
            }

            const modelWithTracing = withTracing(model, posthog, {
                posthogDistinctId: task.agent.userId,
            });

            const aiSdkModel = aisdk(modelWithTracing);

            const trimmedGoal = task.agent.goal.trim();

            const goal = trimmedGoal === "" ? "Execite steps provided by user" : trimmedGoal;

            const agent = new Agent({
                instructions: `You are an ai agent that executes user defined steps in a given order using tools provided alongside.\nYour goal is: ${goal}.\nCurrent date is: ${new Date().toLocaleDateString()}. Respond in user language.`,
                name: "StepsFollowingAgent",
                tools: tools,
                model: aiSdkModel
            });

            const formattedSteps = task.agent.steps.map((step, index) => `${index + 1}. ${step.value}`).join('\n');

            await ctx.runMutation(internal.executionTasks.updateTask, {
                id: args.task._id,
                state: { type: "running" }
            });

            const result = await run(
                agent,
                `Execute these steps: \n${formattedSteps}`
            );

            await ctx.runMutation(internal.executionTasks.updateTask, {
                id: args.task._id,
                state: { type: "success", result: result.finalOutput ?? "No result" }
            });

            await posthog.shutdown();
        } catch (error) {
            console.error("Error executing agent", error);

            await ctx.runMutation(internal.executionTasks.updateTask, {
                id: args.task._id,
                state: { type: "error", error: (error as Error).message }
            });

            await posthog.shutdown();
        }
    }
});
