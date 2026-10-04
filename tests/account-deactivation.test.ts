import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { DEFAULT_PROFILE_PREFERENCES } from "../shared/personal-details";
const mock = vi.hoisted(() => ({ execute: vi.fn(), transaction: vi.fn(), tx: vi.fn(), database: true }));
vi.mock("../server/db", () => ({ getDb: async () => mock.database ? { execute: mock.execute, transaction: mock.transaction } : null }));
import { deactivateAccount, getAccountGeneration, guardAccountMutation } from "../server/account-deactivation";
const tables = ["users", "profiles", "goals", "privacy_settings", "health_permissions", "workout_plans", "workout_sessions", "workout_sets", "routes", "route_points", "supplements", "supplement_schedules", "meals", "activity_summaries", "challenges", "challenge_participants", "friendships", "share_permissions", "feedback"];
const dialect = new MySqlDialect();
const statements = () => mock.tx.mock.calls.map(([query]) => dialect.sqlToQuery(query));
beforeEach(() => {
  vi.clearAllMocks(); mock.database = true;
  mock.execute.mockResolvedValue([[], []]);
  mock.tx.mockImplementation(async query => dialect.sqlToQuery(query).sql.includes("information_schema") ? [tables.map(name => ({ name })), []] : [[], []]);
  mock.transaction.mockImplementation(async action => action({ execute: mock.tx }));
});
describe("deactivate and clear profile", () => {
  it("clears only the authenticated owner's records and rotates sessions in one transaction", async () => {
    const result = await deactivateAccount(7);
    expect(result.success).toBe(true); expect(result.generation).toMatch(/^[0-9a-f-]{36}$/);
    expect(mock.transaction).toHaveBeenCalledTimes(1);
    const queries = statements();
    const deletes = queries.filter(query => query.sql.startsWith("DELETE"));
    expect(deletes.length).toBeGreaterThan(15);
    for (const query of deletes) { expect(query.sql).toContain("WHERE"); expect(query.params.every(param => param === 7)).toBe(true); }
    expect(queries.findIndex(query => query.sql.startsWith("DELETE FROM `workout_sets`"))).toBeLessThan(queries.findIndex(query => query.sql.startsWith("DELETE FROM `workout_sessions`")));
    expect(queries.find(query => query.sql.startsWith("INSERT INTO profiles"))?.params).toEqual([7, "account_7", JSON.stringify(DEFAULT_PROFILE_PREFERENCES)]);
    expect(queries.at(-1)?.params).toEqual([7, result.generation, result.generation]);
    expect(deletes.some(query => /DELETE FROM (users|foods)/.test(query.sql))).toBe(false);
  });
  it("does not claim success or rotate the reset generation when deleting fails", async () => {
    mock.tx.mockImplementation(async query => {
      const statement = dialect.sqlToQuery(query).sql;
      if (statement.includes("information_schema")) return [tables.map(name => ({ name })), []];
      if (statement.startsWith("DELETE")) throw new Error("rollback");
      return [[], []];
    });
    await expect(deactivateAccount(7)).rejects.toThrow("rollback");
    expect(statements().some(query => query.sql.startsWith("INSERT INTO account_profile_resets"))).toBe(false);
  });
  it("refuses invalid owners and unavailable databases before deleting anything", async () => {
    await expect(deactivateAccount(-1)).rejects.toThrow(); mock.database = false;
    await expect(deactivateAccount(7)).rejects.toThrow("not been cleared"); expect(mock.transaction).not.toHaveBeenCalled();
  });
  it("accepts installations without resets but surfaces other database failures", async () => {
    mock.execute.mockRejectedValueOnce({ cause: { code: "ER_NO_SUCH_TABLE" } });
    expect(await getAccountGeneration(7)).toBe("");
    mock.execute.mockRejectedValueOnce(new Error("database offline"));
    await expect(getAccountGeneration(7)).rejects.toThrow("database offline");
  });
  it("rejects a pending save and duplicate deactivation from the old session", async () => {
    mock.tx.mockImplementation(async query => dialect.sqlToQuery(query).sql.startsWith("SELECT generation") ? [[{ generation: "new-reset" }], []] : [[], []]);
    const save = vi.fn();
    await expect(guardAccountMutation(7, "", save)).rejects.toThrow("deactivated");
    await expect(deactivateAccount(7)).rejects.toThrow("already deactivated");
    expect(save).not.toHaveBeenCalled(); expect(statements().some(query => query.sql.startsWith("DELETE"))).toBe(false);
  });
});
