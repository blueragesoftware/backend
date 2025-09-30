import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { user } from "../schema";
import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

const RESEND_RATE_LIMIT_MS = 2000;

export const resendWorkpool = new Workpool(components.resendContactsWorkpool, {
    maxParallelism: 1,
    retryActionsByDefault: true,
    defaultRetryBehavior: {
        maxAttempts: 3,
        initialBackoffMs: RESEND_RATE_LIMIT_MS,
        base: 2,
    },
});

export const createUser = internalMutation({
    args: user,
    handler: async (ctx, args) => {
        await resendWorkpool.enqueueAction(
            ctx,
            internal.resend.execution.createUser,
            args,
            { runAfter: RESEND_RATE_LIMIT_MS }
        );
    },
});

export const updateUser = internalMutation({
    args: user,
    handler: async (ctx, args) => {
        await resendWorkpool.enqueueAction(
            ctx,
            internal.resend.execution.updateUser,
            args,
            { runAfter: RESEND_RATE_LIMIT_MS }
        );
    },
});

export const deleteUser = internalMutation({
    args: v.object({
        email: v.string()
    }),
    handler: async (ctx, args) => {
        await resendWorkpool.enqueueAction(
            ctx,
            internal.resend.execution.deleteUser,
            args,
            { runAfter: RESEND_RATE_LIMIT_MS }
        );
    },
});
