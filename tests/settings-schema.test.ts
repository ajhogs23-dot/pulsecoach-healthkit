import Ajv from "ajv";
import { describe, expect, it } from "vitest";
import schema from "../shared/settings.schema.json";
import personalDetailsEntry from "../shared/personal-details.schema.json";
import { DEFAULT_PROFILE_PREFERENCES, personalDetailsSchema, validatePersonalDetails } from "../shared/personal-details";

const ajv = new Ajv({ allErrors: true, strictNumbers: true });
const validate = ajv.compile(schema);
const profile = { ...DEFAULT_PROFILE_PREFERENCES, name: "Sam", age: 35, sexForEstimate: "Male" as const, heightCm: 180, weightKg: 80 };

describe("settings JSON Schema", () => {
  it("is a valid draft-07 schema with every canonical profile field", () => {
    expect(ajv.validateSchema(schema)).toBe(true);
    expect(Object.keys(schema.definitions.personalDetails.properties).sort()).toEqual(Object.keys(personalDetailsSchema.shape).sort());
    expect(validate(profile)).toBe(true);
    expect(personalDetailsEntry.$ref).toBe("./settings.schema.json");
    expect(personalDetailsEntry.$id).toBe("urn:pulsecoach:personal-details");
  });
  it("matches runtime validation for realistic ranges and supported values", () => {
    const examples = [
      profile,
      { ...profile, name: "   " },
      { ...profile, age: 17 },
      { ...profile, age: 35.5 },
      { ...profile, heightCm: 2 },
      { ...profile, weightKg: 401 },
      { ...profile, targetWeightKg: 10 },
      { ...profile, calorieTarget: 1199 },
      { ...profile, calorieTarget: 6001 },
      { ...profile, unitSystem: "imperial" as const },
      { ...profile, progressRate: 1.1 },
      { ...profile, exerciseFrequency: 8 },
      { ...profile, workoutDuration: 181 },
      { ...profile, allergies: "x".repeat(1001) },
      { ...profile, calorieTargetMode: "estimated" as const },
      { ...profile, calorieTargetMode: "selected" as const },
      { ...profile, calorieTargetMode: "selected" as const, calorieTarget: 2200 },
    ];
    for (const example of examples) expect(validate(example)).toBe(Object.keys(validatePersonalDetails(example)).length === 0);
  });
  it("requires estimate inputs only when the estimated mode is explicitly selected", () => {
    const incomplete = { ...DEFAULT_PROFILE_PREFERENCES, name: "Sam" };
    expect(validate(incomplete)).toBe(true);
    expect(validate({ ...incomplete, calorieTargetMode: "estimated" })).toBe(false);
    expect(validate({ ...profile, calorieTargetMode: "estimated", calorieTarget: 2200 })).toBe(true);
    expect(validate({ ...profile, age: null })).toBe(false);
  });
  it("rejects injected ownership, unknown fields and persisted calculated values", () => {
    for (const field of ["userId", "ownerId", "bmi", "maintenanceCalories", "unknownSetting"]) {
      expect(validate({ ...profile, [field]: 1 })).toBe(false);
    }
  });
  it("validates separate Health and Appearance settings without treating them as profile fields", () => {
    const bundle = ajv.compile({ $ref: "urn:pulsecoach:settings#/definitions/settingsBundle" });
    const health = { steps: true, distance: true, energy: true, exercise: true, workouts: true, heartRate: true, weight: true, sleep: false };
    expect(bundle({ personalDetails: profile, appearance: { colorScheme: "dark" }, appleHealth: health, calculatedValues: { bmi: 24.7, pulseCoachEstimatedDailyCalories: 2990 }, healthDiagnostics: { enabledCategories: ["steps"], recordsReceived: 1 } })).toBe(true);
    expect(bundle({ personalDetails: profile, appleHealth: { ...health, sleep: "enabled" } })).toBe(false);
    expect(validate({ ...profile, appleHealth: health })).toBe(false);
  });
});
