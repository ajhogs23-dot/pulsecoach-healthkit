import { z } from "zod";
import { DEFAULT_USER_SETTINGS, userSettingsSchema, type UserSettings } from "./settings-preferences";
export { DEFAULT_USER_SETTINGS, userSettingsSchema } from "./settings-preferences";
export type { UserSettings } from "./settings-preferences";

export type ProfileGoal = "Lose fat" | "Build strength" | "Improve fitness" | "Maintain health";
export type ActivityLevel = "Sedentary" | "Lightly active" | "Moderately active" | "Very active";
export type EstimateSex = "Male" | "Female";
export type UnitSystem = "metric" | "imperial";
export type WeightGoal = "Weight loss" | "Maintenance" | "Muscle gain";
export type DietaryPreference = "No preference" | "Vegetarian" | "High-protein";
export type TrainingEquipment = "Dumbbells" | "Full gym" | "Bodyweight";
export type CoachingStyle = "Encouraging" | "Direct" | "Minimal";
export type CalorieTargetMode = "selected" | "estimated";

/** Basic information. The current app records age rather than date of birth. */
export interface BasicInformationSettings {
  name: string;
  /** Whole years; validated from 18 to 120. */
  age?: number;
  /** Sex used by the calorie-estimation formula. */
  sexForEstimate?: EstimateSex;
}

/** Measurements always persist in metric units, regardless of display preference. */
export interface BodyDetailsSettings {
  unitSystem?: UnitSystem;
  /** Height in centimetres. */
  heightCm?: number;
  /** Current weight in kilograms. */
  weightKg?: number;
  /** Optional target weight in kilograms. */
  targetWeightKg?: number;
}

export interface GoalSettings {
  goal: ProfileGoal;
  weightGoal?: WeightGoal;
  /** Desired change in kg/week; direction comes from weightGoal. */
  progressRate?: number;
}

export interface ActivityProfileSettings {
  activityLevel: ActivityLevel;
  /** Work and lifestyle activity description. */
  lifestyleActivity?: string;
  /** Typical exercise days per week, from 0 to 7. */
  exerciseFrequency?: number;
}

export interface FoodPreferenceSettings {
  foodPreference: DietaryPreference;
  /** Allergies and food exclusions, retained as the user's text. */
  allergies?: string;
  nutritionApproach?: string;
}

export interface TrainingPreferenceSettings {
  /** Preferred days, in the existing text format (for example, Mon, Wed, Fri). */
  trainingDays?: string;
  /** Preferred workout duration in minutes. */
  workoutDuration?: number;
  trainingSetup: TrainingEquipment;
  /** Injuries, pain, and movement limitations. */
  limitations?: string;
  /** Display name or description of the home gym. */
  homeGym?: string;
  /** Display name or description of the current gym. */
  currentGym?: string;
  /** Optional directory IDs; absent for free-text gym descriptions. */
  homeGymId?: string;
  currentGymId?: string;
}

export interface CoachingPreferenceSettings {
  coachingStyle: CoachingStyle;
  /** Preferred humour and personality level. */
  personality?: string;
  notifications?: string;
  encouragement?: string;
}

export interface CalorieTargetSettings {
  /** User-selected kcal/day, retained even when the estimate is active. */
  calorieTarget?: number;
  /** Absent on legacy records: selected target takes precedence if present. */
  calorieTargetMode?: CalorieTargetMode;
  /** Extended settings remain in the same authenticated profile document. */
  settings?: UserSettings;
}

/**
 * Canonical persisted profile. Compose category interfaces into the existing flat
 * storage/API shape so this type change requires no data migration.
 * Optional fields represent information the user has not provided.
 */
export interface ProfilePreferences extends
  BasicInformationSettings,
  BodyDetailsSettings,
  GoalSettings,
  ActivityProfileSettings,
  FoodPreferenceSettings,
  TrainingPreferenceSettings,
  CoachingPreferenceSettings,
  CalorieTargetSettings {}

/** Calculated kcal/day values; derived from the profile rather than persisted. */
export interface CalorieEstimate {
  readonly restingCalories: number;
  readonly maintenanceCalories: number;
  readonly recommendedCalories: number;
}

/** Presentation fields computed from the canonical measurements. */
export interface BodyDetailsSummary extends BodyDetailsSettings {
  /** kg/m2, calculated automatically; absent until valid measurements exist. */
  readonly bmi?: number;
}

/** Presentation fields recomputed when profile inputs or active mode change. */
export interface CalorieTargetSummary extends CalorieTargetSettings {
  readonly pulseCoachEstimatedDailyCalories?: number;
  readonly estimatedMaintenanceCalories?: number;
  readonly activeDailyCalorieTarget?: number;
}

/** Grouped screen/view contract. Persist ProfilePreferences, not this projection. */
export interface PersonalDetailsCategories {
  basicInformation: BasicInformationSettings;
  bodyDetails: BodyDetailsSummary;
  goals: GoalSettings;
  activityProfile: ActivityProfileSettings;
  foodPreferences: FoodPreferenceSettings;
  trainingPreferences: TrainingPreferenceSettings;
  coachingPreferences: CoachingPreferenceSettings;
  calorieTargets: CalorieTargetSummary;
}

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  name: "",
  goal: "Build strength",
  foodPreference: "No preference",
  trainingSetup: "Full gym",
  coachingStyle: "Encouraging",
  activityLevel: "Moderately active",
};

const activityFactors: Record<ActivityLevel, number> = {
  Sedentary: 1.2,
  "Lightly active": 1.375,
  "Moderately active": 1.55,
  "Very active": 1.725,
};

const goalFactors: Record<ProfileGoal, number> = {
  "Lose fat": 0.85,
  "Build strength": 1.1,
  "Improve fitness": 1,
  "Maintain health": 1,
};

export function calculateCalorieEstimate(profile: ProfilePreferences): CalorieEstimate | undefined {
  const { sexForEstimate, age, heightCm, weightKg } = profile;
  if (!sexForEstimate || !age || !heightCm || !weightKg || age < 18 || age > 120 || heightCm < 100 || heightCm > 250 || weightKg < 30 || weightKg > 400 || ![age, heightCm, weightKg].every(Number.isFinite)) return undefined;

  const sexConstant = sexForEstimate === "Male" ? 5 : -161;
  const restingCalories = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
  const maintenanceCalories = restingCalories * activityFactors[profile.activityLevel];
  if (!Number.isFinite(maintenanceCalories) || restingCalories <= 0) return undefined;
  const direction = profile.weightGoal ?? (profile.goal === "Lose fat" ? "Weight loss" : profile.goal === "Build strength" ? "Muscle gain" : "Maintenance");
  const adjustment = profile.progressRate !== undefined ? profile.progressRate * 7700 / 7 : maintenanceCalories * (profile.weightGoal ? direction === "Weight loss" ? 0.15 : direction === "Muscle gain" ? 0.1 : 0 : Math.abs((goalFactors[profile.goal] ?? 1) - 1));
  const adjusted = maintenanceCalories + (direction === "Weight loss" ? -adjustment : direction === "Muscle gain" ? adjustment : 0);
  const recommendedCalories = direction === "Weight loss" ? Math.max(restingCalories, adjusted) : adjusted;

  return {
    restingCalories: Math.round(restingCalories),
    maintenanceCalories: Math.round(maintenanceCalories),
    recommendedCalories: Math.min(6000, Math.max(1200, Math.round(recommendedCalories / 10) * 10)),
  };
}

export function calculateBMI(profile: Pick<ProfilePreferences, "heightCm" | "weightKg">) {
  const { heightCm, weightKg } = profile;
  if (!heightCm || !weightKg || !Number.isFinite(heightCm + weightKg) || heightCm < 100 || heightCm > 250 || weightKg < 30 || weightKg > 400) return undefined;
  return Math.round(weightKg / ((heightCm / 100) ** 2) * 10) / 10;
}
export function activeCalorieTarget(profile: ProfilePreferences) {
  return profile.calorieTargetMode === "estimated" ? calculateCalorieEstimate(profile)?.recommendedCalories : profile.calorieTarget ?? calculateCalorieEstimate(profile)?.recommendedCalories;
}
export function profileCoachContext(profile: ProfilePreferences) {
  return JSON.stringify({ ...profile, bmi: calculateBMI(profile), activeCalorieTarget: activeCalorieTarget(profile), estimate: calculateCalorieEstimate(profile) });
}

const optionalText = z.string().max(1000).optional();
export const personalDetailsSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  goal: z.enum(["Lose fat", "Build strength", "Improve fitness", "Maintain health"]),
  foodPreference: z.enum(["No preference", "Vegetarian", "High-protein"]),
  trainingSetup: z.enum(["Dumbbells", "Full gym", "Bodyweight"]),
  coachingStyle: z.enum(["Encouraging", "Direct", "Minimal"]),
  sexForEstimate: z.enum(["Male", "Female"]).optional(),
  age: z.number().int().min(18).max(120).optional(),
  heightCm: z.number().min(100).max(250).optional(),
  weightKg: z.number().min(30).max(400).optional(),
  targetWeightKg: z.number().min(30).max(400).optional(),
  activityLevel: z.enum(["Sedentary", "Lightly active", "Moderately active", "Very active"]),
  calorieTarget: z.number().int().min(1200).max(6000).optional(),
  unitSystem: z.enum(["metric", "imperial"]).optional(),
  weightGoal: z.enum(["Weight loss", "Maintenance", "Muscle gain"]).optional(),
  progressRate: z.number().min(0).max(1).optional(),
  lifestyleActivity: optionalText,
  exerciseFrequency: z.number().int().min(0).max(7).optional(),
  allergies: optionalText, nutritionApproach: optionalText, trainingDays: optionalText,
  workoutDuration: z.number().int().min(5).max(180).optional(),
  limitations: optionalText, homeGym: optionalText, currentGym: optionalText, homeGymId: optionalText, currentGymId: optionalText,
  personality: optionalText, notifications: optionalText, encouragement: optionalText,
  calorieTargetMode: z.enum(["selected", "estimated"]).optional(),
  settings: (userSettingsSchema as z.ZodTypeAny).optional(),
}).strict();
export function validatePersonalDetails(profile: ProfilePreferences): Record<string, string> {
  const result = personalDetailsSchema.safeParse(profile);
  const errors: Record<string, string> = {};
  if (!result.success) for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
  if (profile.calorieTargetMode === "selected" && !profile.calorieTarget) errors.calorieTarget = "Enter a daily calorie target (1,200-6,000 kcal).";
  if (profile.calorieTargetMode === "estimated" && !calculateCalorieEstimate(profile)) errors.calorieTargetMode = "Complete sex, age, height and weight to use the estimate.";
  return errors;
}
// Inputs display in the preferred units; persisted measurements always use cm and kg.
export function displayMeasurement(value: number | undefined, kind: "height" | "weight", imperial: boolean) {
  if (value === undefined) return "";
  return String(Math.round(value * (imperial ? kind === "height" ? 1 / 2.54 : 2.2046226218 : 1) * 100) / 100);
}
export function parseMeasurement(text: string, kind: "height" | "weight", imperial: boolean) {
  if (!text.trim()) return undefined;
  return Number(text) / (imperial ? kind === "height" ? 1 / 2.54 : 2.2046226218 : 1);
}

// Legacy records are preserved even when an older screen accepted out-of-range values.
// The editor and all new saves apply the stricter schema above.
export const legacyPersonalDetailsSchema = personalDetailsSchema.extend({
  name: z.string().max(120), age: z.number().optional(), heightCm: z.number().optional(),
  weightKg: z.number().optional(), calorieTarget: z.number().optional(),
}).partial().passthrough();
