import { describe, expect, it, vi } from "vitest";
import { activeCalorieTarget, calculateBMI, calculateCalorieEstimate, DEFAULT_PROFILE_PREFERENCES, displayMeasurement, parseMeasurement, profileCoachContext, validatePersonalDetails } from "../shared/personal-details";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));
import { getWorkoutPlan } from "../lib/workout-log";
const profile = { ...DEFAULT_PROFILE_PREFERENCES, name: "Sam", age: 35, heightCm: 180, weightKg: 80, sexForEstimate: "Male" as const };
describe("shared personal details", () => {
  it("recalculates BMI for height and weight changes", () => {
    expect(calculateBMI(profile)).toBe(24.7);
    expect(calculateBMI({ ...profile, weightKg: 90 })).toBe(27.8);
    expect(calculateBMI({ ...profile, heightCm: 190 })).toBe(22.2);
    expect(calculateBMI({ heightCm: 0, weightKg: 80 })).toBeUndefined();
  });
  it("recalculates estimates from body, activity, goal and progress rate", () => {
    const estimate = calculateCalorieEstimate(profile)!;
    expect(estimate.restingCalories).toBe(1755);
    expect(estimate.maintenanceCalories).toBe(2720);
    for (const change of [{ age: 45 }, { heightCm: 190 }, { weightKg: 90 }, { activityLevel: "Sedentary" as const }, { goal: "Lose fat" as const }, { weightGoal: "Maintenance" as const }, { progressRate: 0.25 }]) expect(calculateCalorieEstimate({ ...profile, ...change })).not.toEqual(estimate);
    expect(calculateCalorieEstimate({ ...profile, weightKg: NaN })).toBeUndefined();
  });
  it("switches modes without destroying the selected calorie target", () => {
    const chosen = { ...profile, calorieTarget: 2200, calorieTargetMode: "selected" as const };
    expect(activeCalorieTarget(chosen)).toBe(2200);
    const estimated = { ...chosen, calorieTargetMode: "estimated" as const };
    expect(activeCalorieTarget(estimated)).toBe(calculateCalorieEstimate(profile)!.recommendedCalories);
    expect(estimated.calorieTarget).toBe(2200);
    expect(activeCalorieTarget({ ...estimated, calorieTargetMode: "selected" })).toBe(2200);
  });
  it("validates realistic values and handles imperial conversion", () => {
    expect(validatePersonalDetails(profile)).toEqual({});
    for (const [key, value] of Object.entries({ age: 200, heightCm: 2, weightKg: -5, targetWeightKg: 900, calorieTarget: 300, progressRate: 5, exerciseFrequency: 8, workoutDuration: 0 })) expect(validatePersonalDetails({ ...profile, [key]: value })[key]).toBeTruthy();
    expect(parseMeasurement("70.8661417", "height", true)).toBeCloseTo(180);
    expect(parseMeasurement("176.36981", "weight", true)).toBeCloseTo(80);
    expect(displayMeasurement(80, "weight", true)).toBe("176.37");
    expect(parseMeasurement("", "weight", true)).toBeUndefined();
  });
  it("workout and coaching consumers use updated shared fields", () => {
    const updated = { ...profile, trainingSetup: "Bodyweight" as const, workoutDuration: 45, limitations: "knee pain", allergies: "peanuts", personality: "No humour", calorieTarget: 2300 };
    const plan = getWorkoutPlan(updated);
    expect(plan.durationMinutes).toBe(45);
    expect(plan.exercises.some((exercise) => /squat/i.test(exercise.name))).toBe(false);
    const context = JSON.parse(profileCoachContext(updated));
    expect(context.allergies).toBe("peanuts");
    expect(context.activeCalorieTarget).toBe(2300);
    expect(context.bmi).toBe(24.7);
  });
});
