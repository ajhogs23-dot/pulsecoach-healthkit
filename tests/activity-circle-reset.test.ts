import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const mock = vi.hoisted(() => ({ execute: vi.fn(), tx: vi.fn(), transaction: vi.fn() }));
vi.mock("../server/db", () => ({ getDb: async () => ({ execute: mock.execute, transaction: mock.transaction }) }));
import { deactivateAccount } from "../server/account-deactivation";
const dialect = new MySqlDialect();
beforeEach(() => { vi.clearAllMocks(); mock.execute.mockResolvedValue([[],[]]); mock.transaction.mockImplementation(job => job({execute:mock.tx})); mock.tx.mockImplementation(async query => dialect.sqlToQuery(query).sql.includes("information_schema") ? [["activity_circle_codes","activity_circle_friends","activity_circle_posts","activity_circle_cheers"].map(name=>({name})),[]] : [[],[]]); });
describe("clear shared activity account data",()=>{
  it("clears owned posts, reactions, friend connections and invite codes",async()=>{
    await deactivateAccount(7);const queries=mock.tx.mock.calls.map(([query])=>dialect.sqlToQuery(query));
    const deletes=queries.filter(query=>query.sql.startsWith("DELETE"));expect(deletes).toHaveLength(5);
    expect(deletes.some(q=>q.sql.includes("p.ownerId = ?"))).toBe(true);expect(deletes.some(q=>q.sql.includes("userLow = ? OR userHigh = ?"))).toBe(true);
    for(const query of deletes)expect(query.params.every(value=>value===7)).toBe(true);
    expect(queries.findIndex(q=>q.sql.startsWith("DELETE c"))).toBeLessThan(queries.findIndex(q=>q.sql.startsWith("DELETE FROM `activity_circle_posts`")));
  });
});
