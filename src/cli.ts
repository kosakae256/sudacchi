import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { db } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { createSudacchi, getAliveSudacchi } from "./db/repository/sudacchi.js";
import { handleMessage } from "./core/handler.js";
import { executeTick } from "./scheduler/tick.js";
import { executeDeathCheck } from "./scheduler/death-check.js";
import { formatStatusBar } from "./engine/status.js";

const CLI_USER_ID = "cli-user";
const TICK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Initialize
runMigrations(db);

function getOrCreateSudacchi() {
	const existing = getAliveSudacchi(db);
	if (existing) return existing;

	const id = randomUUID();
	const now = new Date();
	const created = createSudacchi(db, id, now);
	console.log("\n🥚 スダッチが生まれました！\n");
	return created;
}

function printStatus(sudacchi: ReturnType<typeof getAliveSudacchi>) {
	if (!sudacchi) return;
	console.log(
		formatStatusBar({
			id: sudacchi.id,
			name: sudacchi.name,
			stage: sudacchi.stage,
			hunger: sudacchi.hunger,
			mood: sudacchi.mood,
			energy: sudacchi.energy,
			isSleeping: sudacchi.isSleeping,
			bornAt: sudacchi.bornAt,
			diedAt: sudacchi.diedAt,
			lastFedAt: sudacchi.lastFedAt,
			lastPlayedAt: sudacchi.lastPlayedAt,
			lastSleptAt: sudacchi.lastSleptAt,
			lastInteractionAt: sudacchi.lastInteractionAt,
			hungerZeroSince: sudacchi.hungerZeroSince,
			moodZeroSince: sudacchi.moodZeroSince,
			allLowSince: sudacchi.allLowSince,
		}),
	);
}

type SudacchiRow = NonNullable<ReturnType<typeof getAliveSudacchi>>;

async function main() {
	let sudacchi: SudacchiRow = getOrCreateSudacchi();

	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	// Periodic tick
	const tickTimer = setInterval(() => {
		const result = executeTick(db, 10);
		if (result) {
			const death = executeDeathCheck(db);
			if (death.isDead) {
				console.log(`\n💀 ${death.reason}`);
				console.log("スダッチは旅立ってしまいました...\n");
				console.log('/reset で新しいスダッチを孵化させられます\n');
			}
		}
	}, TICK_INTERVAL_MS);

	let isClosed = false;
	rl.on("close", () => { isClosed = true; });
	const prompt = () => {
		if (isClosed) return;
		rl.question("> ", handleInput);
	};

	async function handleInput(line: string) {
		const trimmed = line.trim();
		if (!trimmed) {
			prompt();
			return;
		}

		// Special commands
		if (trimmed === "/quit" || trimmed === "/exit") {
			console.log("バイバイ！👋");
			clearInterval(tickTimer);
			rl.close();
			process.exit(0);
		}

		if (trimmed === "/status") {
			sudacchi = getAliveSudacchi(db)!;
			if (!sudacchi) {
				console.log("スダッチはいません。/reset で孵化させましょう。\n");
			} else {
				printStatus(sudacchi);
				console.log();
			}
			prompt();
			return;
		}

		if (trimmed.startsWith("/tick")) {
			const minutes = Number.parseInt(trimmed.split(" ")[1] ?? "10", 10);
			const result = executeTick(db, minutes);
			if (result) {
				console.log(`⏰ ${minutes}分経過しました`);
				const death = executeDeathCheck(db);
				if (death.isDead) {
					console.log(`\n💀 ${death.reason}`);
					console.log("スダッチは旅立ってしまいました...\n");
					console.log('/reset で新しいスダッチを孵化させられます\n');
				} else {
					sudacchi = getAliveSudacchi(db)!;
					printStatus(sudacchi);
					console.log();
				}
			} else {
				console.log("生きているスダッチがいません。\n");
			}
			prompt();
			return;
		}

		if (trimmed === "/reset") {
			const id = randomUUID();
			const now = new Date();
			createSudacchi(db, id, now);
			sudacchi = getAliveSudacchi(db)!;
			console.log("\n🥚 新しいスダッチが生まれました！\n");
			prompt();
			return;
		}

		// Normal message
		if (!sudacchi || sudacchi.diedAt) {
			sudacchi = getAliveSudacchi(db)!;
			if (!sudacchi) {
				console.log("スダッチはいません。/reset で孵化させましょう。\n");
				prompt();
				return;
			}
		}

		try {
			const result = await handleMessage(db, {
				userId: CLI_USER_ID,
				message: trimmed,
				sudacchiId: sudacchi.id,
			});

			console.log(`スダッチ: ${result.response}`);
			if (result.statusBar) {
				console.log(result.statusBar.split("\n").map((l) => `        ${l}`).join("\n"));
			}
			console.log();

			// Refresh state
			sudacchi = getAliveSudacchi(db)!;
		} catch (err) {
			console.error("エラーが発生しました:", (err as Error).message);
			console.log();
		}

		prompt();
	}

	prompt();
}

main().catch(console.error);
