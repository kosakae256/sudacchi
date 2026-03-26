import { config } from "./config.js";

if (config.MODE === "cli") {
	await import("./cli.js");
} else {
	const { startSlack } = await import("./slack/app.js");
	await startSlack();
}
