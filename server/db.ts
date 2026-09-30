import { DEFAULT_PROFILE_PREFERENCES, personalDetailsSchema, type ProfilePreferences } from "../shared/personal-details";
import { DEFAULT_USER_SETTINGS } from "../shared/settings-preferences";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, feedback, goals, profiles, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows[0];
}

export async function upsertProfile(userId: number, data: { username: string; avatarUrl?: string; unitSystem?: "metric" | "imperial"; timezone?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(profiles).values({ userId, ...data }).onDuplicateKeyUpdate({ set: {
    ...data,
    ...(data.unitSystem ? { personalDetailsJson: sql`CASE WHEN ${profiles.personalDetailsJson} IS NULL THEN NULL ELSE JSON_SET(${profiles.personalDetailsJson}, '$.unitSystem', ${data.unitSystem}) END` } : {}),
  } });
  return getProfile(userId);
}

export async function upsertGoal(userId: number, data: { currentWeight?: string; goalWeight?: string; pace?: "cautious" | "steady" | "slower"; primaryGoal?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(goals).values({ userId, ...data }).onDuplicateKeyUpdate({ set: data });
  return db.select().from(goals).where(eq(goals.userId, userId)).limit(1);
}

export async function createFeedback(userId: number, data: { category: "feature" | "issue" | "change"; message: string; contactAllowed: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(feedback).values({ userId, ...data });
  return { id: Number((result as unknown as { insertId?: number }).insertId ?? 0) };
}

export async function getAdminOverview() {
  const db = await getDb();
  if (!db) return { registeredUsers: 0, activeUsers: 0, feedbackOpen: 0 };
  const [registered, active, feedbackOpen] = await Promise.all([
    db.select({ value: sql<number>`count(*)` }).from(users),
    db.select({ value: sql<number>`count(*)` }).from(users).where(sql`lastSignedIn >= DATE_SUB(NOW(), INTERVAL 30 DAY)`),
    db.select({ value: sql<number>`count(*)` }).from(feedback).where(sql`status IN ('new', 'reviewing', 'planned')`),
  ]);
  return { registeredUsers: Number(registered[0]?.value ?? 0), activeUsers: Number(active[0]?.value ?? 0), feedbackOpen: Number(feedbackOpen[0]?.value ?? 0) };
}


export async function getPersonalDetails(userId: number, name: string | null) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const profile = await getProfile(userId);
  const legacyGoals = await database.select().from(goals).where(eq(goals.userId, userId)).orderBy(sql`${goals.updatedAt} DESC`).limit(1);
  const legacy = legacyGoals[0];
  const details: ProfilePreferences = { ...DEFAULT_PROFILE_PREFERENCES, name: name ?? "", unitSystem: profile?.unitSystem ?? "metric" };
  if (legacy?.currentWeight && Number.isFinite(Number(legacy.currentWeight))) details.weightKg = Number(legacy.currentWeight);
  if (legacy?.goalWeight && Number.isFinite(Number(legacy.goalWeight))) details.targetWeightKg = Number(legacy.goalWeight);
  if (legacy?.primaryGoal) details.goal = legacy.primaryGoal as ProfilePreferences["goal"];
  if (legacy?.pace) details.progressRate = legacy.pace === "steady" ? 0.5 : 0.25;
  const stored = profile?.personalDetailsJson ? JSON.parse(profile.personalDetailsJson) : {};
  return { details: { ...DEFAULT_PROFILE_PREFERENCES, ...Object.fromEntries(Object.entries(profile?.personalDetailsJson ? { ...DEFAULT_PROFILE_PREFERENCES, ...stored } : details).filter(([key]) => key in personalDetailsSchema.shape)) as Partial<ProfilePreferences>, settings: { ...DEFAULT_USER_SETTINGS, ...(stored.settings ?? {}) } }, migrated: Boolean(profile?.personalDetailsJson), existing: { ...(name ? { name } : {}), ...(legacy?.currentWeight ? { weightKg: details.weightKg } : {}), ...(legacy?.goalWeight ? { targetWeightKg: details.targetWeightKg } : {}), ...(legacy?.primaryGoal ? { goal: details.goal } : {}), ...(legacy?.pace ? { progressRate: details.progressRate } : {}), ...(profile ? { unitSystem: profile.unitSystem } : {}), ...stored } };
}
export async function savePersonalDetails(userId: number, name: string | null, details: ProfilePreferences, importing = false) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const current = await getPersonalDetails(userId, name);
  if (importing && current.migrated) return current.details;
  const existingProfile = await getProfile(userId);
  const previous = existingProfile?.personalDetailsJson ? JSON.parse(existingProfile.personalDetailsJson) : {};
  const unknownFields = Object.fromEntries(Object.entries(previous).filter(([key]) => !(key in personalDetailsSchema.shape)));
  const next = importing ? { ...current.details, ...details, ...current.existing } : { ...unknownFields, ...details };
  const personalDetailsJson = JSON.stringify(next);
  // Import is insert-if-empty so concurrent migrations cannot replace a saved profile.
  await database.insert(profiles).values({ userId, username: `account_${userId}`, unitSystem: next.unitSystem ?? "metric", personalDetailsJson }).onDuplicateKeyUpdate({ set: importing ? { personalDetailsJson: sql`COALESCE(${profiles.personalDetailsJson}, ${personalDetailsJson})` } : { personalDetailsJson, unitSystem: next.unitSystem ?? "metric" } });
  return (await getPersonalDetails(userId, name)).details;
}
