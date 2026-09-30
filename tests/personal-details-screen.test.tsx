import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { DEFAULT_PROFILE_PREFERENCES } from "../shared/personal-details";
const mocks = vi.hoisted(() => ({ user: { openId: "sam", name: "Sam" } as { openId: string; name: string } | null, load: vi.fn(), save: vi.fn(), push: vi.fn(), prevent: vi.fn() }));
vi.mock("react-native", () => ({ Text: "Text", View: "View", TextInput: "TextInput", Pressable: "Pressable", ScrollView: "ScrollView", ActivityIndicator: "ActivityIndicator", StyleSheet: { create: (styles: unknown) => styles }, Platform: { OS: "ios" }, Alert: { alert: vi.fn() } }));
vi.mock("expo-router", () => ({ router: { push: mocks.push, back: vi.fn() }, useNavigation: () => ({ dispatch: vi.fn() }), useFocusEffect: (callback: () => (() => void) | void) => React.useEffect(callback, [callback]) }));
vi.mock("@react-navigation/native", () => ({ usePreventRemove: mocks.prevent }));
vi.mock("@/components/screen-container", () => ({ ScreenContainer: "ScreenContainer" }));
vi.mock("@/components/ui/icon-symbol", () => ({ IconSymbol: "IconSymbol" }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock("@/lib/theme-provider", () => ({ useThemeContext: () => ({ colorScheme: "dark", setColorScheme: vi.fn() }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { feedback: { create: { useMutation: () => ({ mutate: vi.fn() }) } } } }));
vi.mock("@/lib/healthkit", () => ({ loadHealthSnapshot: async () => ({ status: "connected" }) }));
vi.mock("@/lib/profile-preferences", async () => ({ ...await import("../shared/personal-details"), loadCachedProfilePreferences: async () => undefined, loadProfilePreferences: mocks.load, saveProfilePreferences: mocks.save }));
import ProfileScreen from "../app/(profile)/profile";
import PersonalDetailsScreen from "../app/(profile)/personal-details";
let tree: ReactTestRenderer;
let persisted = { ...DEFAULT_PROFILE_PREFERENCES, name: "Sam", age: 35, heightCm: 180, weightKg: 80, sexForEstimate: "Male" as const, calorieTarget: 2200 };
const nodes = (type: string) => tree.root.findAll((node) => node.type === type);
const button = (text: string) => nodes("Pressable").find((node) => node.findAll((child) => String(child.type) === "Text").some((child) => child.children.join("") === text))!;
const input = (label: string) => nodes("TextInput").find((node) => node.props.accessibilityLabel === label)!;
async function render(element = <PersonalDetailsScreen />) { await act(async () => { tree = create(element); }); }
async function change(label: string, value: string) { await act(async () => input(label).props.onChangeText(value)); }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks(); mocks.user = { openId: "sam", name: "Sam" };
  persisted = { ...DEFAULT_PROFILE_PREFERENCES, name: "Sam", age: 35, heightCm: 180, weightKg: 80, sexForEstimate: "Male", calorieTarget: 2200 };
  mocks.load.mockImplementation(async () => ({ ...persisted }));
  mocks.save.mockImplementation(async (_key, value) => { persisted = { ...value }; return persisted; });
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
describe("Personal Details screens", () => {
  it("opens from one short Profile row and retains Apple Health", async () => {
    await render(<ProfileScreen />);
    await act(async () => tree.root.findByProps({ accessibilityLabel: "Personal Details" }).props.onPress());
    expect(mocks.push).toHaveBeenCalledWith("/(profile)/personal-details");
    await act(async () => tree.root.findByProps({ accessibilityLabel: "Personal Details" }).props.onPress());
    expect(mocks.push).toHaveBeenCalledTimes(1);
    expect(nodes("TextInput")).toHaveLength(1); // Feedback only.
    expect(button("Apple Health")).toBeDefined();
  });
  it("loads existing information, saves and reopens", async () => {
    await render();
    expect(input("Name").props.value).toBe("Sam");
    expect(input("Current weight (kg)").props.value).toBe("80");
    await change("Name", "Sam Updated");
    expect(mocks.prevent).toHaveBeenLastCalledWith(true, expect.any(Function));
    await act(async () => button("Save").props.onPress());
    expect(mocks.save).toHaveBeenCalledWith("sam", expect.objectContaining({ name: "Sam Updated", weightKg: 80 }));
    await act(async () => tree.unmount()); await render();
    expect(input("Name").props.value).toBe("Sam Updated");
    expect(button("Save").props.disabled).toBe(true);
  });
  it("recalculates BMI and calories while editing and switches active targets", async () => {
    await render();
    const before = JSON.stringify(tree.toJSON());
    await change("Current weight (kg)", "90");
    expect(JSON.stringify(tree.toJSON())).not.toBe(before);
    expect(JSON.stringify(tree.toJSON())).toContain("27.8");
    await act(async () => button("Use PulseCoach estimate").props.onPress());
    await act(async () => button("Save").props.onPress());
    expect(persisted).toMatchObject({ weightKg: 90, calorieTarget: 2200, calorieTargetMode: "estimated" });
    await act(async () => button("Use my selected target").props.onPress());
    await act(async () => button("Save").props.onPress());
    expect(persisted).toMatchObject({ calorieTarget: 2200, calorieTargetMode: "selected" });
  });
  it("shows validation errors and retains edits after failed saves", async () => {
    await render(); await change("Current weight (kg)", "-5");
    await act(async () => button("Save").props.onPress());
    expect(mocks.save).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("highlighted");
    await change("Current weight (kg)", "85");
    mocks.save.mockRejectedValueOnce(new Error("offline"));
    await act(async () => button("Save").props.onPress());
    expect(input("Current weight (kg)").props.value).toBe("85");
    expect(JSON.stringify(tree.toJSON())).toContain("Could not save");
  });
  it("uses imperial units without changing untouched measurements", async () => {
    await render();
    await act(async () => button("Imperial (in, lb)").props.onPress());
    expect(input("Current weight (lb)").props.value).toBe("176.37");
    await act(async () => button("Save").props.onPress());
    expect(persisted.weightKg).toBe(80);
    expect(persisted.heightCm).toBe(180);
  });
  it("does not load or show personal details when signed out", async () => {
    mocks.user = null; await render();
    expect(mocks.load).not.toHaveBeenCalled();
    expect(nodes("TextInput")).toHaveLength(0);
  });
  it("shows a visible loading state during a slow first load", async () => {
    let resolve!: (value: typeof persisted) => void;
    mocks.load.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await render();
    expect(nodes("ActivityIndicator")).toHaveLength(1);
    await act(async () => resolve({ ...persisted }));
    expect(input("Name").props.value).toBe("Sam");
  });
  it("shows Retry and Back after a failed load, then reloads without restarting", async () => {
    mocks.load.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ...persisted });
    await render();
    expect(JSON.stringify(tree.toJSON())).toContain("Could not load your details");
    await act(async () => button("Retry").props.onPress());
    expect(input("Name").props.value).toBe("Sam");
    expect(JSON.stringify(tree.toJSON())).toContain("Back");
  });
});
