import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { DEFAULT_PROFILE_PREFERENCES } from "../shared/personal-details";

// Kept outside the profile: clearing or editing a profile must never revive old sessions.
type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
async function readGeneration(database: Pick<Database, "execute">, userId: number): Promise<string> {
  try {
    const [rows] = await database.execute(sql`SELECT generation FROM account_profile_resets WHERE userId = ${userId} LIMIT 1`);
    return (rows as unknown as Array<{ generation: string }>)[0]?.generation ?? "";
  } catch (error) {
    // Older installations have no resets until the first account is deactivated.
    const cause = (error as { cause?: { code?: string } }).cause ?? error as { code?: string };
    if (cause.code === "ER_NO_SUCH_TABLE") return "";
    throw error;
  }
}

export async function getAccountGeneration(userId: number): Promise<string> {
  const database = await getDb();
  if (!database) throw new Error("Account service unavailable.");
  return readGeneration(database, userId);
}

// Serialize personal-data writes with deactivation so an in-flight save cannot restore a cleared profile.
export async function guardAccountMutation<T>(userId: number, generation: string, action: () => Promise<T>): Promise<T> {
  const database = await getDb();
  if (!database) throw new Error("Account service unavailable.");
  return database.transaction(async transaction => {
    await transaction.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
    if (await readGeneration(transaction, userId) !== generation) throw new Error("This profile was deactivated. Sign in to start fresh.");
    return action();
  });
}

export async function deactivateAccount(userId: number, expectedGeneration = "") {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("Sign in to deactivate your account.");
  const database = await getDb();
  if (!database) throw new Error("Account service unavailable. Your profile has not been cleared.");
  // This independent table avoids changing existing user/profile schemas. Failure leaves data intact.
  await database.execute(sql`CREATE TABLE IF NOT EXISTS account_profile_resets (userId INT PRIMARY KEY, generation VARCHAR(36) NOT NULL) ENGINE=InnoDB`);
  const generation = randomUUID();
  await database.transaction(async transaction => {
    await transaction.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
    const [tableRows] = await transaction.execute(sql`SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`);
    if (await readGeneration(transaction, userId) !== expectedGeneration) throw new Error("This profile was already deactivated. Sign in to start fresh.");
    const tables = new Set((tableRows as unknown as Array<{ name: string }>).map(row => row.name));
    // Children are removed before their parent; every predicate uses the authenticated owner.
    const children: Array<[string, string, string, string]> = [
      ["workout_sets", "sessionId", "workout_sessions", "userId"],
      ["route_points", "routeId", "routes", "userId"],
      ["supplement_schedules", "supplementId", "supplements", "userId"],
      ["challenge_participants", "challengeId", "challenges", "creatorId"],
      ["program_group_members", "groupId", "program_groups", "ownerId"],
      ["shared_programs", "groupId", "program_groups", "ownerId"],
    ];
    for (const [child, foreignKey, parent, owner] of children) {
      if (tables.has(child) && tables.has(parent)) {
        await transaction.execute(sql`DELETE FROM ${sql.identifier(child)} WHERE ${sql.identifier(foreignKey)} IN (SELECT id FROM ${sql.identifier(parent)} WHERE ${sql.identifier(owner)} = ${userId})`);
      }
    }
    if (tables.has("activity_circle_cheers") && tables.has("activity_circle_posts")) await transaction.execute(sql`DELETE c FROM activity_circle_cheers c JOIN activity_circle_posts p ON p.id = c.postId WHERE p.ownerId = ${userId}`);
    if (tables.has("activity_circle_friends")) await transaction.execute(sql`DELETE FROM activity_circle_friends WHERE userLow = ${userId} OR userHigh = ${userId}`);
    const owned: Array<[string, string]> = [
      ["activity_circle_codes", "userId"], ["activity_circle_cheers", "userId"], ["activity_circle_posts", "ownerId"],
      ["profiles", "userId"], ["goals", "userId"], ["privacy_settings", "userId"],
      ["health_permissions", "userId"], ["workout_plans", "userId"], ["routes", "userId"],
      ["workout_sessions", "userId"], ["activity_summaries", "userId"], ["meals", "userId"],
      ["supplements", "userId"], ["challenge_participants", "userId"], ["challenges", "creatorId"],
      ["feedback", "userId"], ["equipment_reports", "userId"], ["security_challenges", "userId"],
      ["program_group_members", "userId"], ["shared_programs", "ownerId"],
      ["program_groups", "ownerId"], ["supplement_catalogue", "ownerId"],
    ];
    for (const [table, owner] of owned) {
      if (tables.has(table)) await transaction.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE ${sql.identifier(owner)} = ${userId}`);
    }
    if (tables.has("friendships")) await transaction.execute(sql`DELETE FROM friendships WHERE requesterId = ${userId} OR addresseeId = ${userId}`);
    if (tables.has("share_permissions")) await transaction.execute(sql`DELETE FROM share_permissions WHERE ownerId = ${userId} OR friendId = ${userId}`);
    for (const table of ["email_accounts", "account_security"]) {
      if (tables.has(table)) await transaction.execute(sql`UPDATE ${sql.identifier(table)} SET phone = NULL, phoneVerified = FALSE, sessionVersion = sessionVersion + 1 WHERE userId = ${userId}`);
    }
    // An empty, migrated profile prevents any other device importing its old local profile.
    const empty = JSON.stringify(DEFAULT_PROFILE_PREFERENCES);
    await transaction.execute(sql`INSERT INTO profiles (userId, username, personalDetailsJson, unitSystem) VALUES (${userId}, ${`account_${userId}`}, ${empty}, 'metric')`);
    await transaction.execute(sql`INSERT INTO account_profile_resets (userId, generation) VALUES (${userId}, ${generation}) ON DUPLICATE KEY UPDATE generation = ${generation}`);
  });
  // Only the sign-in identity is retained so the same provider can create a fresh profile.
  return { success: true as const, generation };
}
