import { env } from "./config";

export default {
    providers: [
        {
            domain: env.CLERK_JWT_ISSUER_DOMAIN,
            applicationID: "convex",
        },
    ],
};