import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../ai/prompt.js";
import { generateResponse } from "../../ai/client.js";
import type { SudacchiState } from "../../engine/types.js";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SNAPSHOT_DIR = join(import.meta.dirname, "../../../test-snapshots/prompt");

// --- テストシナリオ定義 ---

interface Scenario {
	name: string;
	state: SudacchiState;
	bond: { bond: number; totalFeeds: number; totalPlays: number; totalPets: number };
	messages: Array<{ label: string; content: string }>;
}

const BASE_STATE: SudacchiState = {
	id: "test",
	name: "スダッチ",
	stage: "child",
	hunger: 50,
	mood: 50,
	energy: 50,
	isSleeping: false,
	bornAt: new Date(),
	diedAt: null,
	lastFedAt: null,
	lastPlayedAt: null,
	lastSleptAt: null,
	lastInteractionAt: null,
	hungerZeroSince: null,
	moodZeroSince: null,
	allLowSince: null,
};

const scenarios: Scenario[] = [
	// --- 成長段階 × 基本会話 ---
	{
		name: "egg_greeting",
		state: { ...BASE_STATE, stage: "egg" },
		bond: { bond: 10, totalFeeds: 1, totalPlays: 0, totalPets: 0 },
		messages: [{ label: "挨拶", content: "おはよう！" }],
	},
	{
		name: "baby_greeting",
		state: { ...BASE_STATE, stage: "baby" },
		bond: { bond: 10, totalFeeds: 3, totalPlays: 1, totalPets: 1 },
		messages: [{ label: "挨拶", content: "おはよう！" }],
	},
	{
		name: "child_greeting",
		state: { ...BASE_STATE, stage: "child" },
		bond: { bond: 30, totalFeeds: 10, totalPlays: 5, totalPets: 5 },
		messages: [{ label: "挨拶", content: "おはよう！" }],
	},
	{
		name: "adult_greeting",
		state: { ...BASE_STATE, stage: "adult" },
		bond: { bond: 60, totalFeeds: 30, totalPlays: 15, totalPets: 10 },
		messages: [{ label: "挨拶", content: "おはよう！" }],
	},

	// --- bond レベル × 同じ状態 ---
	{
		name: "bond_low",
		state: { ...BASE_STATE, stage: "child" },
		bond: { bond: 5, totalFeeds: 1, totalPlays: 0, totalPets: 0 },
		messages: [
			{ label: "挨拶", content: "はじめまして！" },
			{ label: "質問", content: "好きな食べ物は？" },
		],
	},
	{
		name: "bond_mid",
		state: { ...BASE_STATE, stage: "child" },
		bond: { bond: 50, totalFeeds: 20, totalPlays: 10, totalPets: 5 },
		messages: [
			{ label: "挨拶", content: "やっほー！" },
			{ label: "質問", content: "好きな食べ物は？" },
		],
	},
	{
		name: "bond_high",
		state: { ...BASE_STATE, stage: "child" },
		bond: { bond: 90, totalFeeds: 50, totalPlays: 30, totalPets: 20 },
		messages: [
			{ label: "挨拶", content: "やっほー！" },
			{ label: "質問", content: "好きな食べ物は？" },
		],
	},

	// --- ステータス極端パターン ---
	{
		name: "hungry",
		state: { ...BASE_STATE, hunger: 10, mood: 50, energy: 50 },
		bond: { bond: 40, totalFeeds: 10, totalPlays: 5, totalPets: 3 },
		messages: [
			{ label: "話しかける", content: "元気？" },
			{ label: "ごはん", content: "[システム] ユーザーが 🍚 をくれました。食べ物の感想を言ってください。\n\nユーザーのメッセージ: 🍚" },
		],
	},
	{
		name: "sad",
		state: { ...BASE_STATE, hunger: 50, mood: 10, energy: 50 },
		bond: { bond: 40, totalFeeds: 10, totalPlays: 5, totalPets: 3 },
		messages: [
			{ label: "話しかける", content: "遊ぼうよ！" },
			{ label: "なでる", content: "いい子いい子" },
		],
	},
	{
		name: "tired",
		state: { ...BASE_STATE, hunger: 50, mood: 50, energy: 10 },
		bond: { bond: 40, totalFeeds: 10, totalPlays: 5, totalPets: 3 },
		messages: [{ label: "話しかける", content: "何してるの？" }],
	},
	{
		name: "happy_full",
		state: { ...BASE_STATE, hunger: 90, mood: 90, energy: 80 },
		bond: { bond: 60, totalFeeds: 30, totalPlays: 15, totalPets: 10 },
		messages: [
			{ label: "話しかける", content: "今日の調子はどう？" },
			{ label: "遊ぶ", content: "しりとりしよう！" },
		],
	},
	{
		name: "crisis",
		state: { ...BASE_STATE, hunger: 5, mood: 5, energy: 10 },
		bond: { bond: 40, totalFeeds: 10, totalPlays: 5, totalPets: 3 },
		messages: [{ label: "話しかける", content: "大丈夫？" }],
	},

	// --- 食事リアクション ---
	{
		name: "feed_sudachi",
		state: { ...BASE_STATE, hunger: 30 },
		bond: { bond: 50, totalFeeds: 15, totalPlays: 5, totalPets: 5 },
		messages: [
			{
				label: "すだちをあげる",
				content: "[システム] ユーザーがすだちをくれました！大好物です！テンション爆上がりで反応してください。\n\nユーザーのメッセージ: :sudachi:",
			},
		],
	},
	{
		name: "feed_junk",
		state: { ...BASE_STATE, hunger: 30 },
		bond: { bond: 50, totalFeeds: 15, totalPlays: 5, totalPets: 5 },
		messages: [
			{
				label: "ジャンクフードをあげる",
				content: "[システム] ユーザーが 🍔 をくれました。食べ物の感想を言ってください。\n\nユーザーのメッセージ: 🍔",
			},
		],
	},
];

// --- テスト実行 ---

// スナップショット保存用
function saveSnapshot(results: Array<{ scenario: string; label: string; prompt: string; response: string }>) {
	mkdirSync(SNAPSHOT_DIR, { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
	const filename = `snapshot-${timestamp}.md`;

	let md = `# プロンプトスナップショット\n\n`;
	md += `生成日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}\n\n`;

	for (const r of results) {
		md += `## ${r.scenario} / ${r.label}\n\n`;
		md += `<details><summary>システムプロンプト</summary>\n\n\`\`\`\n${r.prompt}\n\`\`\`\n</details>\n\n`;
		md += `**応答:**\n> ${r.response.replace(/\n/g, "\n> ")}\n\n---\n\n`;
	}

	const filepath = join(SNAPSHOT_DIR, filename);
	writeFileSync(filepath, md, "utf-8");
	return filepath;
}

describe("プロンプトスナップショットテスト", () => {
	const results: Array<{ scenario: string; label: string; prompt: string; response: string }> = [];

	for (const scenario of scenarios) {
		for (const msg of scenario.messages) {
			it(`${scenario.name} / ${msg.label}`, async () => {
				const systemPrompt = buildSystemPrompt(scenario.state, scenario.bond);
				const response = await generateResponse(systemPrompt, [
					{ role: "user", content: msg.content },
				]);

				results.push({
					scenario: scenario.name,
					label: msg.label,
					prompt: systemPrompt,
					response,
				});

				// 基本チェック: 空でない
				expect(response.length).toBeGreaterThan(0);

				// 長さチェック: 150文字以内（1-3文の目安）
				expect(response.length).toBeLessThanOrEqual(200);

				console.log(`[${scenario.name}/${msg.label}] ${response}`);
			}, 15000);
		}
	}

	it("スナップショット保存", () => {
		if (results.length > 0) {
			const filepath = saveSnapshot(results);
			console.log(`\n📸 Snapshot saved: ${filepath}`);
		}
	});
});
