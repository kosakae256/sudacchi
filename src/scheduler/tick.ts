import type { Db } from "../db/client.js";
import { getAliveSudacchi, updateSudacchi } from "../db/repository/sudacchi.js";
import { tickStatus } from "../engine/status.js";
import type { SudacchiState } from "../engine/types.js";

export interface TickResult {
	previousState: { hunger: number; mood: number; energy: number };
	newState: { hunger: number; mood: number; energy: number };
}

export function executeTick(db: Db, elapsedMinutes: number): TickResult | null {
	const row = getAliveSudacchi(db);
	if (!row || row.isSleeping) return null;

	const now = new Date();
	const state: SudacchiState = {
		id: row.id,
		name: row.name,
		stage: row.stage,
		hunger: row.hunger,
		mood: row.mood,
		energy: row.energy,
		isSleeping: row.isSleeping,
		bornAt: row.bornAt,
		diedAt: row.diedAt,
		lastFedAt: row.lastFedAt,
		lastPlayedAt: row.lastPlayedAt,
		lastSleptAt: row.lastSleptAt,
		lastInteractionAt: row.lastInteractionAt,
		hungerZeroSince: row.hungerZeroSince,
		moodZeroSince: row.moodZeroSince,
		allLowSince: row.allLowSince,
	};

	const previous = { hunger: state.hunger, mood: state.mood, energy: state.energy };
	const newState = tickStatus(state, elapsedMinutes, now);

	updateSudacchi(db, row.id, {
		hunger: newState.hunger,
		mood: newState.mood,
		energy: newState.energy,
		hungerZeroSince: newState.hungerZeroSince,
		moodZeroSince: newState.moodZeroSince,
		allLowSince: newState.allLowSince,
	});

	return {
		previousState: previous,
		newState: { hunger: newState.hunger, mood: newState.mood, energy: newState.energy },
	};
}
