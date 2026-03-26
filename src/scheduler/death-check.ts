import type { Db } from "../db/client.js";
import { getAliveSudacchi, updateSudacchi } from "../db/repository/sudacchi.js";
import { checkDeath, type DeathResult } from "../engine/death.js";
import type { SudacchiState } from "../engine/types.js";

export function executeDeathCheck(db: Db): DeathResult {
	const row = getAliveSudacchi(db);
	if (!row) return { isDead: false };

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

	const now = new Date();
	const result = checkDeath(state, now);

	if (result.isDead) {
		updateSudacchi(db, row.id, { diedAt: now });
	}

	return result;
}
