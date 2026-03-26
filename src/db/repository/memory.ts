import { and, eq } from "drizzle-orm";
import type { Db } from "../client.js";
import { memories } from "../schema.js";

export function getShortTermMemories(db: Db, sudacchiId: string) {
	return db
		.select()
		.from(memories)
		.where(and(eq(memories.sudacchiId, sudacchiId), eq(memories.type, "short_term")))
		.all();
}

export function getLongTermMemories(db: Db, sudacchiId: string) {
	return db
		.select()
		.from(memories)
		.where(and(eq(memories.sudacchiId, sudacchiId), eq(memories.type, "long_term")))
		.all();
}
