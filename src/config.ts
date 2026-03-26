import "dotenv/config";
import { z } from "zod/v4";

const configSchema = z.object({
	ANTHROPIC_API_KEY: z.string().min(1),
	ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
	DATABASE_PATH: z.string().default("./data/sudacchi.db"),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	TZ: z.string().default("Asia/Tokyo"),
	MODE: z.enum(["cli", "slack"]).default("cli"),

	// Slack (optional for CLI mode)
	SLACK_BOT_TOKEN: z.string().optional(),
	SLACK_SIGNING_SECRET: z.string().optional(),
	SLACK_APP_TOKEN: z.string().optional(),
	SUDACCHI_CHANNEL_ID: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

export const config = configSchema.parse(process.env);
