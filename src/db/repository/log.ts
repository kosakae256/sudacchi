import { desc, eq } from "drizzle-orm";
import type { Db } from "../client.js";
import { interactionLogs } from "../schema.js";

export function createLog(
	db: Db,
	data: typeof interactionLogs.$inferInsert,
) {
	return db.insert(interactionLogs).values(data).returning().get();
}

export function getRecentLogs(db: Db, sudacchiId: string, limit = 20) {
	return db
		.select()
		.from(interactionLogs)
		.where(eq(interactionLogs.sudacchiId, sudacchiId))
		.orderBy(desc(interactionLogs.createdAt))
		.limit(limit)
		.all();
}
