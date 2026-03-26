import { eq, isNull } from "drizzle-orm";
import type { Db } from "../client.js";
import { sudacchi } from "../schema.js";

export function createSudacchi(db: Db, id: string, now: Date) {
	return db
		.insert(sudacchi)
		.values({
			id,
			bornAt: now,
			lastInteractionAt: now,
		})
		.returning()
		.get();
}

export function getAliveSudacchi(db: Db) {
	return db.select().from(sudacchi).where(isNull(sudacchi.diedAt)).get();
}

export function getSudacchiById(db: Db, id: string) {
	return db.select().from(sudacchi).where(eq(sudacchi.id, id)).get();
}

export function updateSudacchi(
	db: Db,
	id: string,
	data: Partial<typeof sudacchi.$inferInsert>,
) {
	return db.update(sudacchi).set(data).where(eq(sudacchi.id, id)).returning().get();
}
