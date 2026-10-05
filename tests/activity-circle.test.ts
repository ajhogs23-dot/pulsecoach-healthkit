import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const mock = vi.hoisted(() => ({ execute: vi.fn(), getDb: vi.fn() }));
vi.mock("../server/db", () => ({ getDb: mock.getDb }));
import { activityCircle } from "../server/activity-circle";
const dialect = new MySqlDialect();
const queries = () => mock.execute.mock.calls.map(([query]) => dialect.sqlToQuery(query));
beforeEach(() => { vi.clearAllMocks(); mock.getDb.mockResolvedValue({ execute: mock.execute }); mock.execute.mockResolvedValue([[], []]); });
describe("friends data permissions", () => {
  it("filters the feed by the viewer or currently accepted friends, with bounded pagination", async () => {
    await activityCircle.feed(7, 99); const query = queries().find(item => item.sql.startsWith("SELECT p.id"))!;
    expect(query.sql).toContain("f.status = 'accepted'"); expect(query.sql).toContain("p.ownerId = ? OR EXISTS"); expect(query.sql).toContain("p.id < ?"); expect(query.sql).toContain("LIMIT 21"); expect(query.params).toEqual([7, 7, 7, 7, 99]);
  });
  it("prevents a requester accepting their own request", async () => {
    mock.execute.mockImplementation(async query => dialect.sqlToQuery(query).sql.startsWith("SELECT requesterId") ? [[{ requesterId: 7, status: "pending" }], []] : [[], []]);
    await expect(activityCircle.respond(7, 9, true)).rejects.toThrow("no longer available"); expect(queries().some(q => q.sql.startsWith("UPDATE"))).toBe(false);
  });
  it("lets only the recipient accept a still-pending request", async () => {
    mock.execute.mockImplementation(async query => dialect.sqlToQuery(query).sql.startsWith("SELECT requesterId") ? [[{ requesterId: 9, status: "pending" }], []] : [[], []]);
    await activityCircle.respond(7, 9, true); const update = queries().find(q => q.sql.startsWith("UPDATE"))!; expect(update.params).toEqual(["accepted", 7, 9, 9]); expect(update.sql).toContain("status = 'pending'");
  });
  it("deletes posts and their reactions only through the authenticated owner", async () => {
    await activityCircle.unpublish(7, 55); const deletes = queries().filter(q => q.sql.startsWith("DELETE")); expect(deletes).toHaveLength(2); for (const q of deletes) { expect(q.sql).toContain("ownerId = ?"); expect(q.params).toEqual([55, 7]); }
  });
  it("cannot cheer an activity that is not shared with the viewer", async () => { await expect(activityCircle.cheer(7, 55, true)).rejects.toThrow("no longer shared"); expect(queries().some(q => q.sql.startsWith("INSERT IGNORE"))).toBe(false); });
  it("replaces the whole opted-in payload so removing a route removes its coordinates", async () => {
    const post = { localId: "walk:1", activity: "Walk" as const, title: "Walk", caption: "", completedAt: "2026-10-05T03:00:00Z", seconds: 90, distanceMetres: 100, elevationGain: 0, route: [] };
    await activityCircle.publish(7, post); const query = queries().find(q => q.sql.startsWith("INSERT INTO activity_circle_posts"))!; expect(query.params).toEqual([7, "walk:1", JSON.stringify(post)]); expect(query.sql).toContain("ON DUPLICATE KEY UPDATE activityJson = VALUES(activityJson)");
  });
  it("reports storage failures instead of inventing a successful send", async () => { mock.getDb.mockResolvedValue(null); await expect(activityCircle.feed(7)).rejects.toThrow("unavailable"); });
});
