import { and, eq } from "drizzle-orm";
import type { Db } from "../client.js";
import { userBonds } from "../schema.js";

export function getOrCreateBond(db: Db, userId: string, sudacchiId: string) {
	const existing = db
		.select()
		.from(userBonds)
		.where(and(eq(userBonds.userId, userId), eq(userBonds.sudacchiId, sudacchiId)))
		.get();

	if (existing) return existing;

	return db
		.insert(userBonds)
		.values({ userId, sudacchiId })
		.returning()
		.get();
}

export function updateBond(
	db: Db,
	userId: string,
	sudacchiId: string,
	data: Partial<typeof userBonds.$inferInsert>,
) {
	return db
		.update(userBonds)
		.set(data)
		.where(and(eq(userBonds.userId, userId), eq(userBonds.sudacchiId, sudacchiId)))
		.returning()
		.get();
}
