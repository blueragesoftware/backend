import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

http.route({
    path: "/clerk-users-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const event = await validateRequest(request, process.env.CLERK_WEBHOOK_SECRET!);

        if (!event) {
            return new Response("Error occured", { status: 400 });
        }

        switch (event.type) {
            case "user.created": // intentional fallthrough
            case "user.updated":
                await ctx.runMutation(internal.users.upsertFromClerk, {
                    data: event.data,
                });
                break;

            case "user.deleted": {
                const clerkUserId = event.data.id!;
                await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
                break;
            }
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
        const event = await validateRequest(request, process.env.COMPOSIO_WEBHOOK_SECRET!);

        if (!event) {
            return new Response("Error occured", { status: 400 });
        }

        console.log(`Composion webhook: ${request.body}`);

        return new Response(null, { status: 200 });
    }),
});

http.route({
    path: "/getImage",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const { searchParams } = new URL(request.url);
        const storageId = searchParams.get("storageId")! as Id<"_storage">;
        const blob = await ctx.storage.get(storageId);
        if (blob === null) {
            return new Response("Image not found", {
                status: 404,
            });
        }
        return new Response(blob);
    }),
});

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

export default http;