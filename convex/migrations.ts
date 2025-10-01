import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { DataModel, Id } from "./_generated/dataModel.js";
import { internal } from "./_generated/api.js";
import { env } from "./env.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

export const addFilesToAgents = migrations.define({
    table: "agents",
    migrateOne: () => ({ files: [] }),
});

export const addFilesToExecutionTasks = migrations.define({
    table: "executionTasks",
    migrateOne: async (ctx, doc) => {
        if (doc.agent.files === undefined) {
            await ctx.db.patch(doc._id, { agent: { ...doc.agent, files: [] } });
        }
    },
});

export const replaceAgentIconUrls = migrations.define({
    table: "agents",
    migrateOne: async (ctx, doc) => {
        if (!doc.iconUrl.includes("/getImage")) {
            return;
        }

        const defaultImagesIds = env.DEFAULT_IMAGE_IDS
            .split(", ")
            .filter((value) => value.length > 0) as Array<Id<"_storage">>;

        if (defaultImagesIds.length === 0) {
            return;
        }

        const randomImageId = defaultImagesIds[Math.floor(Math.random() * defaultImagesIds.length)];
        const iconUrl = await ctx.storage.getUrl(randomImageId);

        if (iconUrl === null) {
            return;
        }

        await ctx.db.patch(doc._id, { iconUrl });
    },
});

export const runAll = migrations.runner([
    internal.migrations.addFilesToAgents,
    internal.migrations.addFilesToExecutionTasks,
    internal.migrations.replaceAgentIconUrls,
]);
