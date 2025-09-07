import { defineApp } from "convex/server";
import workpool from "@convex-dev/workpool/convex.config";

const app = defineApp();

app.use(workpool, { name: "agentsWorkpool" });

export default app;