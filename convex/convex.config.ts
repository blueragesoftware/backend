import { defineApp } from "convex/server";
import workpool from "@convex-dev/workpool/convex.config";
import migrations from "@convex-dev/migrations/convex.config";

const app = defineApp();

app.use(workpool, { name: "agentsWorkpool" });
app.use(workpool, { name: "resendContactsWorkpool" });
app.use(migrations);

export default app;