import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { DeletedObjectJSON, UserJSON, WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { Resend } from "resend";
import { env } from "./env";
import { Infer } from "convex/values";
import { user as userSchema } from "./schema";

const http = httpRouter();
const resend = new Resend(env.RESEND_API_KEY);

http.route({
    path: "/clerk-users-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const event = await validateRequest(request, env.CLERK_WEBHOOK_SECRET);

        if (!event) {
            return new Response("Error occurred", { status: 400 });
        }

        switch (event.type) {
            case "user.created":
                await handleUserCreated(ctx, event.data);
                break;
            case "user.updated":
                await handleUserUpdated(ctx, event.data);
                break;
            case "user.deleted":
                await handleUserDeleted(ctx, event.data);
                break;
            default:
                console.log("Ignored Clerk webhook event", event.type);
        }

        return new Response(null, { status: 200 });
    }),
});

http.route({
    path: "/composio-webhook",
    method: "POST",
    handler: httpAction(async (_ctx, request) => {
        const event = await validateRequest(request, env.COMPOSIO_WEBHOOK_SECRET);

        if (!event) {
            return new Response("Error occurred", { status: 400 });
        }

        return new Response(null, { status: 200 });
    }),
});

export default http;

async function validateRequest(req: Request, secret: string): Promise<WebhookEvent | null> {
    const payloadString = await req.text();

    const svixHeaders = {
        "svix-id": req.headers.get("svix-id")!,
        "svix-timestamp": req.headers.get("svix-timestamp")!,
        "svix-signature": req.headers.get("svix-signature")!,
    };

    const wh = new Webhook(secret);

    try {
        return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
    } catch (error) {
        console.error("Error verifying webhook event", error);
        return null;
    }
}

async function handleUserCreated(ctx: ActionCtx, user: UserJSON) {
    if (!user?.id) {
        console.warn("Clerk creation payload missing user id");
        return;
    }

    const userSchema = toUserSchema(user);

    await ctx.runMutation(internal.users.upsertFromClerk, userSchema);

    await ctx.runMutation(internal.resend.register.createUser, userSchema);
}

async function handleUserUpdated(ctx: ActionCtx, user: UserJSON) {
    const clerkUserId = user?.id;

    if (!clerkUserId) {
        console.warn("Clerk update event missing user id");
        return;
    }

    const existingUser = await ctx.runQuery(internal.users.getByExternalId, {
        externalId: clerkUserId,
    });

    const previousEmail = existingUser?.email ?? undefined;

    const userSchema = toUserSchema(user);

    await ctx.runMutation(internal.users.upsertFromClerk, userSchema);

    const newEmail = userSchema.email;

    if (previousEmail && previousEmail !== newEmail) {
        await ctx.runMutation(internal.resend.register.deleteUser, {
            "email": previousEmail
        });

        await ctx.runMutation(internal.resend.register.createUser, userSchema);

        return;
    }

    if (!newEmail) {
        if (!previousEmail) {
            console.warn("Missing primary email for Clerk user", userSchema.externalId);
        }

        return;
    }

    await ctx.runMutation(internal.resend.register.updateUser, userSchema);
}

async function handleUserDeleted(ctx: ActionCtx, payload: DeletedObjectJSON) {
    const clerkUserId = payload?.id;

    if (!clerkUserId) {
        console.warn("Clerk deletion event missing user id");
        return;
    }

    const existingUser = await ctx.runQuery(internal.users.getByExternalId, {
        externalId: clerkUserId,
    });

    if (existingUser?.email) {
        await ctx.runMutation(internal.resend.register.deleteUser, {
            "email": existingUser?.email
        });
    }

    await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
}

function getPrimaryEmailFromClerk(data: UserJSON): string | undefined {
    if (data.email_addresses.length === 0) {
        return undefined;
    }

    if (data.primary_email_address_id) {
        const primary = data.email_addresses.find(
            (address) => address.id === data.primary_email_address_id
        );

        if (primary?.email_address) {
            return primary.email_address;
        }
    }

    const [firstAddress] = data.email_addresses;

    return firstAddress?.email_address ?? undefined;
}

function toUserSchema(data: UserJSON): Infer<typeof userSchema> {
    return {
        externalId: data.id,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        email: getPrimaryEmailFromClerk(data),
    };
}