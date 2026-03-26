import type { SudacchiState } from "./types.js";

export interface DeathResult {
	isDead: boolean;
	reason?: string;
}

const HOURS = (h: number) => h * 60 * 60 * 1000;

export function checkDeath(state: SudacchiState, now: Date): DeathResult {
	// Condition 1: hunger == 0 for 12+ hours
	if (
		state.hunger === 0 &&
		state.hungerZeroSince &&
		now.getTime() - state.hungerZeroSince.getTime() >= HOURS(12)
	) {
		return { isDead: true, reason: "おなかが空っぽのまま長い時間が経ってしまった..." };
	}

	// Condition 2: hunger == 0 AND mood == 0 for 6+ hours
	if (
		state.hunger === 0 &&
		state.mood === 0 &&
		state.hungerZeroSince &&
		state.moodZeroSince &&
		now.getTime() - state.hungerZeroSince.getTime() >= HOURS(6) &&
		now.getTime() - state.moodZeroSince.getTime() >= HOURS(6)
	) {
		return { isDead: true, reason: "おなかもきげんも限界だった..." };
	}

	// Condition 3: all params <= 20 for 24+ hours
	if (
		state.allLowSince &&
		now.getTime() - state.allLowSince.getTime() >= HOURS(24)
	) {
		return { isDead: true, reason: "ずっとぜんぶの調子が悪いままだった..." };
	}

	return { isDead: false };
}
