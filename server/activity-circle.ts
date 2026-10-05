import { randomBytes } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "./db";
import { activityPostSchema, type ActivityPost, type CircleFriend, type SharedActivity } from "../shared/activity-sharing";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
const installations = new WeakMap<object, Promise<void>>();
export const circleTables = [
  "CREATE TABLE IF NOT EXISTS activity_circle_codes (userId INT PRIMARY KEY, code VARCHAR(15) NOT NULL UNIQUE) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS activity_circle_friends (userLow INT NOT NULL, userHigh INT NOT NULL, requesterId INT NOT NULL, status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending', PRIMARY KEY(userLow,userHigh), KEY circle_friend_high(userHigh,status)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS activity_circle_posts (id INT AUTO_INCREMENT PRIMARY KEY, ownerId INT NOT NULL, localId VARCHAR(160) NOT NULL, activityJson MEDIUMTEXT NOT NULL, createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY activity_owner_local(ownerId,localId), KEY activity_owner_feed(ownerId,id)) ENGINE=InnoDB",
  "CREATE TABLE IF NOT EXISTS activity_circle_cheers (postId INT NOT NULL, userId INT NOT NULL, PRIMARY KEY(postId,userId), KEY circle_cheer_user(userId), CONSTRAINT activity_circle_cheers_post_fk FOREIGN KEY(postId) REFERENCES activity_circle_posts(id) ON DELETE CASCADE) ENGINE=InnoDB",
];
async function database() {
  const db = await getDb();
  if (!db) throw new Error("Friends sharing is unavailable. Your activity is still saved on this device.");
  if (!installations.has(db)) installations.set(db, (async () => { for (const statement of circleTables) await db.execute(sql.raw(statement)); })().catch(error => { installations.delete(db); throw error; }));
  await installations.get(db);
  return db;
}
async function rows<T>(db: Database, query: SQL): Promise<T[]> { const [result] = await db.execute(query); return result as unknown as T[]; }
const visible = (viewer: number) => sql`(p.ownerId = ${viewer} OR EXISTS (SELECT 1 FROM activity_circle_friends f WHERE f.status = 'accepted' AND ((f.userLow = ${viewer} AND f.userHigh = p.ownerId) OR (f.userHigh = ${viewer} AND f.userLow = p.ownerId))))`;
type PostRow = { id: number; ownerId: number; activityJson: string; author: string; cheers: number; cheered: number };
function post(row: PostRow): SharedActivity { return { ...activityPostSchema.parse(JSON.parse(row.activityJson)), id: row.id, ownerId: row.ownerId, author: row.author || "Veltura athlete", cheers: Number(row.cheers), cheered: Boolean(Number(row.cheered)) }; }

export const activityCircle = {
  async circle(userId: number) {
    const db = await database();
    const code = `VT-${randomBytes(6).toString("hex").toUpperCase()}`;
    await db.execute(sql`INSERT INTO activity_circle_codes (userId,code) VALUES (${userId},${code}) ON DUPLICATE KEY UPDATE userId = userId`);
    const [own] = await rows<{ code: string }>(db, sql`SELECT code FROM activity_circle_codes WHERE userId = ${userId}`);
    const friends = await rows<{ id: number; name: string; status: "pending" | "accepted"; requesterId: number }>(db, sql`SELECT u.id, COALESCE(u.name,'Veltura athlete') AS name, f.status, f.requesterId FROM activity_circle_friends f JOIN users u ON u.id = IF(f.userLow = ${userId},f.userHigh,f.userLow) WHERE (f.userLow = ${userId} OR f.userHigh = ${userId}) AND f.status IN ('pending','accepted')`);
    return { code: own.code, friends: friends.map(({ requesterId, ...friend }): CircleFriend => ({ ...friend, incoming: requesterId !== userId })) };
  },
  async request(userId: number, code: string) {
    const db = await database();
    const [recipient] = await rows<{ userId: number }>(db, sql`SELECT userId FROM activity_circle_codes WHERE code = ${code}`);
    if (!recipient) throw new Error("That friend code was not found. Ask your friend to open Community and share their code.");
    if (recipient.userId === userId) throw new Error("That is your own friend code.");
    const low = Math.min(userId, recipient.userId), high = Math.max(userId, recipient.userId);
    // A repeated or reciprocal request never grants access: the recipient must explicitly accept.
    await db.execute(sql`INSERT INTO activity_circle_friends (userLow,userHigh,requesterId,status) VALUES (${low},${high},${userId},'pending') ON DUPLICATE KEY UPDATE requesterId = IF(status = 'declined',VALUES(requesterId),requesterId), status = IF(status = 'declined','pending',status)`);
    return { success: true as const };
  },
  async respond(userId: number, friendId: number, accept: boolean) {
    const db = await database();
    const low = Math.min(userId, friendId), high = Math.max(userId, friendId);
    const [friend] = await rows<{ requesterId: number; status: string }>(db, sql`SELECT requesterId,status FROM activity_circle_friends WHERE userLow = ${low} AND userHigh = ${high}`);
    if (!friend || friend.status !== "pending" || friend.requesterId !== friendId || friendId === userId) throw new Error("This friend request is no longer available.");
    await db.execute(sql`UPDATE activity_circle_friends SET status = ${accept ? "accepted" : "declined"} WHERE userLow = ${low} AND userHigh = ${high} AND requesterId = ${friendId} AND status = 'pending'`);
    return { success: true as const };
  },
  async removeFriend(userId: number, friendId: number) {
    const db = await database();
    await db.execute(sql`DELETE FROM activity_circle_friends WHERE userLow = ${Math.min(userId, friendId)} AND userHigh = ${Math.max(userId, friendId)}`);
    return { success: true as const };
  },
  async publish(userId: number, input: ActivityPost) {
    const db = await database();
    await db.execute(sql`INSERT INTO activity_circle_posts (ownerId,localId,activityJson) VALUES (${userId},${input.localId},${JSON.stringify(input)}) ON DUPLICATE KEY UPDATE activityJson = VALUES(activityJson)`);
    return { success: true as const };
  },
  async feed(userId: number, beforeId?: number) {
    const db = await database();
    const results = await rows<PostRow>(db, sql`SELECT p.id,p.ownerId,p.activityJson,COALESCE(u.name,'Veltura athlete') AS author, (SELECT COUNT(*) FROM activity_circle_cheers c WHERE c.postId = p.id) AS cheers, (SELECT COUNT(*) FROM activity_circle_cheers c WHERE c.postId = p.id AND c.userId = ${userId}) AS cheered FROM activity_circle_posts p JOIN users u ON u.id = p.ownerId WHERE ${visible(userId)} ${beforeId ? sql`AND p.id < ${beforeId}` : sql``} ORDER BY p.id DESC LIMIT 21`);
    return { posts: results.slice(0, 20).map(post), nextCursor: results.length > 20 ? results[19].id : undefined };
  },
  async unpublish(userId: number, id: number) {
    const db = await database();
    // The join ensures even reactions can only be removed with the owner's own post.
    await db.execute(sql`DELETE c FROM activity_circle_cheers c JOIN activity_circle_posts p ON p.id = c.postId WHERE p.id = ${id} AND p.ownerId = ${userId}`);
    await db.execute(sql`DELETE FROM activity_circle_posts WHERE id = ${id} AND ownerId = ${userId}`);
    return { success: true as const };
  },
  async cheer(userId: number, id: number, enabled: boolean) {
    const db = await database();
    const [allowed] = await rows<{ id: number }>(db, sql`SELECT p.id FROM activity_circle_posts p WHERE p.id = ${id} AND ${visible(userId)}`);
    if (!allowed) throw new Error("This activity is no longer shared with you.");
    if (enabled) await db.execute(sql`INSERT IGNORE INTO activity_circle_cheers (postId,userId) SELECT p.id,${userId} FROM activity_circle_posts p WHERE p.id = ${id} AND ${visible(userId)}`);
    else await db.execute(sql`DELETE FROM activity_circle_cheers WHERE postId = ${id} AND userId = ${userId}`);
    return { success: true as const };
  },
};
