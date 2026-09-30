import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getRoutes } from "expo-router/build/getRoutesCore";
import { getReactNavigationConfig } from "expo-router/build/getReactNavigationConfig";
import type { RequireContext } from "expo-router/build/types";

// Discover the real route files using the same route-tree builder as Expo Router.
function routeTree() {
  const directory = resolve(process.cwd(), "app");
  const files = readdirSync(directory, { recursive: true }).map(String).filter((file) => /\.tsx$/.test(file));
  const context = Object.assign((key: string) => {
    const source = readFileSync(resolve(directory, key), "utf8");
    const initialRouteName = source.match(/initialRouteName: "([^"]+)"/)?.[1];
    return { default: () => null, ...(initialRouteName ? { unstable_settings: { initialRouteName } } : {}) };
  }, { keys: () => files.map((file) => `./${file.replace(/\\/g, "/")}`), resolve: (key: string) => key, id: "navigation-test" }) as RequireContext;
  return getRoutes(context, { platform: "ios", skipGenerated: true, getSystemRoute: () => { throw new Error("Unexpected generated route"); } })!;
}

describe("nested Profile navigation", () => {
  it("places Profile details in one nested stack beside the main tabs", () => {
    const routes = routeTree();
    const profile = routes.children.find((route) => route.route === "(profile)")!;
    expect(profile.initialRouteName).toBe("profile");
    expect(profile.children.map((route) => route.route).sort()).toEqual(["health", "health-diagnostics", "personal-details", "profile"]);
    expect(routes.children.some((route) => route.route === "(tabs)")).toBe(true);
    expect(routes.children.some((route) => route.route === "personal-details")).toBe(false);
  });
  it("keeps the existing detail paths and all six tabs in the linking configuration", () => {
    const config = getReactNavigationConfig(routeTree(), true);
    const profile = config.screens["(profile)"];
    expect(profile).toMatchObject({ initialRouteName: "profile", screens: { profile: "profile", "personal-details": "personal-details", health: "health", "health-diagnostics": "health-diagnostics" } });
    const tabs = config.screens["(tabs)"];
    expect(typeof tabs === "object" && Object.keys(tabs.screens).sort()).toEqual(["coach", "index", "nutrition", "progress", "supplements", "workout"]);
  });
});
