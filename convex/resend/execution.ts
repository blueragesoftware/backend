"use node";

import { internalAction } from "../_generated/server";
import { Resend } from "resend";
import { user } from "../schema";
import { env } from "../config";
import { v } from "convex/values";

const resendClient = new Resend(env.RESEND_API_KEY);

export const createUser = internalAction({
    args: user,
    handler: async (_ctx, args) => {
        if (args.email === undefined) {
            throw new Error(`Can't create resend user for id: ${args.externalId} since the email is missing`);
        }

        const result = await resendClient.contacts.create({
            audienceId: env.RESEND_AUDIENCE_ID,
            email: args.email,
            firstName: args.firstName ?? undefined,
            lastName: args.lastName ?? undefined,
            unsubscribed: false,
        });

        if (result.error !== null) {
            throw new Error(result.error.message)
        }
    },
});

export const updateUser = internalAction({
    args: user,
    handler: async (_ctx, args) => {
        if (args.email === undefined) {
            throw new Error(`Can't create resend user for id: ${args.externalId} since the email is missing`);
        }

        const user = await resendClient.contacts.get({ audienceId: env.RESEND_AUDIENCE_ID, email: args.email });

        if (user === null) {
            throw new Error(`Can't update resend user for id: ${args.externalId} with email: ${args.email} since user is missing`);
        }

        const result = await resendClient.contacts.update({
            audienceId: env.RESEND_AUDIENCE_ID,
            email: args.email,
            firstName: args.firstName ?? undefined,
            lastName: args.lastName ?? undefined,
            unsubscribed: user.data?.unsubscribed,
        });

        if (result.error !== null) {
            throw new Error(result.error.message)
        }
    },
});

export const deleteUser = internalAction({
    args: v.object({
        email: v.string()
    }),
    handler: async (_ctx, args) => {
        const result = await resendClient.contacts.remove({
            audienceId: env.RESEND_AUDIENCE_ID,
            email: args.email
        });

        if (result.error !== null) {
            throw new Error(result.error.message)
        }
    }
});