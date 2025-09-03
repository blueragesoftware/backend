"use node";

import { Agent, run } from "@openai/agents";
import { Composio } from '@composio/core';
import { OpenAIAgentsProvider } from '@composio/openai-agents';
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { aisdk, AiSdkModel } from '@openai/agents-extensions';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { action } from './_generated/server';
import { ConvexError, v } from "convex/values";
import { api, internal } from './_generated/api';
import { decryptCustomKey } from "./models";

export const executeWithId = action({
    args: {
        // taskId: v.id("tasks"),
        agentId: v.id("agents")
    },
    handler: async (ctx, args) => {
        try {
            const getByIdWithModelResponse = await ctx.runQuery(api.agents.getByIdWithModel, {
                id: args.agentId
            });

            if (getByIdWithModelResponse === null) {
                throw new ConvexError("Agent not found");
            }

            const composio = new Composio({
                provider: new OpenAIAgentsProvider({
                    strict: true
                })
            });

            const requestedToolSlugs = getByIdWithModelResponse.agent.tools.map(tool => tool.slug);

            const userAvailableRequestedTools = await ctx.runAction(api.tools.getToolsBySlugsForUser, {
                slugs: requestedToolSlugs
            });

            const user = await ctx.runQuery(internal.users.getCurrentOrThrow);

            const tools = await composio.tools.get(user._id, {
                toolkits: requestedToolSlugs
            });

            // Verify all requested tools are available
            const requestedSet = new Set(requestedToolSlugs);
            const availableSet = new Set(userAvailableRequestedTools.map(tool => tool.slug));

            const missingTools = [...requestedSet].filter(slug => !availableSet.has(slug));

            if (missingTools.length > 0) {
                throw new ConvexError(`Missing tools: ${missingTools.join(', ')}`);
            }

            let model: AiSdkModel;

            switch (getByIdWithModelResponse.model.provider) {
                case "openrouter":
                    const decryptedOpenRouterKey = await decryptCustomKey(getByIdWithModelResponse.model.encryptedCustomApiKey || null);
                    const openrouter = createOpenRouter(decryptedOpenRouterKey ? { apiKey: decryptedOpenRouterKey } : {});

                    model = aisdk(openrouter.chat(getByIdWithModelResponse.model.modelId));
                    break;
                case "openai":
                    const decryptedOpenAIKey = await decryptCustomKey(getByIdWithModelResponse.model.encryptedCustomApiKey || null);
                    const openai = createOpenAI(decryptedOpenAIKey ? { apiKey: decryptedOpenAIKey } : {});

                    model = aisdk(openai.chat(getByIdWithModelResponse.model.modelId));
                    break;
                case "anthropic":
                    const decryptedAnthropicKey = await decryptCustomKey(getByIdWithModelResponse.model.encryptedCustomApiKey || null);
                    const anthropic = createAnthropic(decryptedAnthropicKey ? { apiKey: decryptedAnthropicKey } : {});

                    model = aisdk(anthropic.chat(getByIdWithModelResponse.model.modelId));
                    break;
                default:
                    throw new ConvexError("Invalid model provider");
            }

            const goal = getByIdWithModelResponse.agent.goal;
            const toolNames = tools.map(tool => tool.name);

            // await ctx.runMutation(internal.tasks.updateTask, {
            //     id: args.taskId,
            //     state: "running"
            // });

            const agent = new Agent({
                instructions: `You are an ai agent that executes user defined steps in a given order using tools provided alongside.\nYour goal is: ${goal}.\nAvailable tools: ${toolNames}.\nCurrent date is: ${new Date().toLocaleDateString()}.`,
                name: "StepsFollowingAgent",
                tools: tools,
                model
            });

            const formattedSteps = getByIdWithModelResponse.agent.steps.map((step, index) => `${index + 1}. ${step.value}`).join('\n');

            const result = await run(
                agent,
                `Execute these steps: \n${formattedSteps}\nUse these tools: ${toolNames}`
            );

            console.log("result", result.finalOutput);

            return result.finalOutput;

            // await ctx.runMutation(internal.tasks.updateTask, {
            //     id: args.taskId,
            //     state: "success",
            //     result: result.finalOutput
            // });
        } catch (error) {
            console.error("Error executing agent", error);

            // await ctx.runMutation(internal.tasks.updateTask, {
            //     id: args.taskId,
            //     state: "error",
            //     result: (error as Error).message
            // })

            throw error;
        }
    }
});

