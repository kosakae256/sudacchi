import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		env: {
			MODE: "cli",
		},
		setupFiles: ["dotenv/config"],
	},
});
