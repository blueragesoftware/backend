/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agents from "../agents.js";
import type * as domains_agents from "../domains/agents.js";
import type * as domains_models from "../domains/models.js";
import type * as domains_tools from "../domains/tools.js";
import type * as models from "../models.js";
import type * as tasks from "../tasks.js";
import type * as tools from "../tools.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  "domains/agents": typeof domains_agents;
  "domains/models": typeof domains_models;
  "domains/tools": typeof domains_tools;
  models: typeof models;
  tasks: typeof tasks;
  tools: typeof tools;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
