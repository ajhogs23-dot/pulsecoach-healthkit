import { z } from "zod";

export type VisibilityScope = "friends" | "local" | "state" | "national" | "global";
export type DistanceUnit = "kilometres" | "miles";
export type WeightUnit = "kilograms" | "pounds";
export type HeightUnit = "centimetres" | "feet-inches";
export type TemperatureUnit = "celsius" | "fahrenheit";
export type EnergyUnit = "kcal" | "kJ";
export type PaceUnit = "min/km" | "min/mile";
export type SpeedUnit = "km/h" | "mph";

export interface ProfileHealthSettings {
  profilePhotoUri?: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  gender?: string;
  fitnessLevel?: string;
  activityType?: string;
  restingHeartRate?: number;
  maximumHeartRate?: number;
  vo2Max?: number;
  bodyFatPercentage?: number;
  medicalConditions?: string;
  wheelchairMode?: boolean;
  pregnancyMode?: boolean;
}
export interface DailyGoalsSettings { [key: string]: number | boolean | undefined; steps?: number; calorieIntakeTarget?: number; caloriesBurned?: number; activeMinutes?: number; distance?: number; floorsClimbed?: number; sleepDurationMinutes?: number; waterIntakeLitres?: number; pulseCoachEstimatedCalories?: number; useEstimatedCalories?: boolean; }
export interface WeeklyGoalsSettings { [key: string]: number | undefined; runningDistance?: number; cyclingDistance?: number; strengthSessions?: number; gymSessions?: number; }
export interface LongTermGoalsSettings { weightGoal?: string; bodyFatGoal?: number; strengthTargets?: string; customGoals?: string; }
export interface GoalsSettings { daily: DailyGoalsSettings; weekly: WeeklyGoalsSettings; longTerm: LongTermGoalsSettings; }
export interface UnitsSettings { distance: DistanceUnit; weight: WeightUnit; height: HeightUnit; temperature: TemperatureUnit; energy: EnergyUnit; pace: PaceUnit; speed: SpeedUnit; }
export interface WorkoutSettings { autoStartDetection: boolean; autoPause: boolean; voiceFeedback: boolean; audioLanguage: string; musicPriority: "workout" | "music"; captions: boolean; hapticFeedback: boolean; metrics: { [key: string]: boolean; heartRate: boolean; pace: boolean; distance: boolean; calories: boolean; cadence: boolean; elevation: boolean; burnBar: boolean }; equipment: { treadmill?: string; rowingMachine?: string; exerciseBike?: string; stairClimber?: string; availability?: string; homeGym?: string; currentWorkoutGym?: string; }; }
export interface WellnessSettings { sleep: boolean; nutrition: boolean; mindfulness: boolean; }
export interface CoachingAISettings { adaptiveTraining: boolean; difficultyAutoAdjustment: boolean; injuryRecoveryMode: boolean; aiNutritionSuggestions: boolean; aiSleepOptimisation: boolean; weeklyTrainingPlan: boolean; preferredWorkoutTypes?: string; preferredTrainers?: string; coachingStyle?: string; humourLevel?: string; musicGenres?: string; equipmentAvailability?: string; }
export interface SocialCommunitySettings { friendsAndGroups: boolean; blockedUsers?: string; groupVisibility: VisibilityScope; challengeParticipation: boolean; leaderboardPrivacy: boolean; automaticallyShareWorkouts: boolean; shareAchievements: boolean; shareRoutes: boolean; visibility: Record<VisibilityScope, boolean>; }
export interface NotificationSettings { workoutNotifications: boolean; healthNotifications: boolean; mealLoggingReminders: boolean; motivationalMessages: boolean; appNotifications: boolean; }
export interface PrivacyPermissionsSettings { activityTracking: boolean; foregroundLocation: boolean; heartRateAccess: boolean; sleepTracking: boolean; menstrualCycleTracking: boolean; stressSpO2EcgAccess: boolean; appleHealth: boolean; androidHealth: boolean; wearableSync: boolean; connectedApps?: string; publicProfile: boolean; leaderboardVisibility: boolean; routeSharing: boolean; friendDiscovery: boolean; }
export interface AppSettings { theme: "system" | "light" | "dark"; textSize: "standard" | "large" | "extra-large"; reducedMotion: boolean; highContrast: boolean; screenReaderImprovements: boolean; language: string; offlineData: boolean; cacheManagement: "automatic" | "manual"; diagnostics: boolean; }
export interface UserSettings { profileHealth: ProfileHealthSettings; goals: GoalsSettings; units: UnitsSettings; workout: WorkoutSettings; wellness: WellnessSettings; coachingAI: CoachingAISettings; socialCommunity: SocialCommunitySettings; notifications: NotificationSettings; privacyPermissions: PrivacyPermissionsSettings; app: AppSettings; }

export const DEFAULT_USER_SETTINGS: UserSettings = {
  profileHealth: {}, goals: { daily: {}, weekly: {}, longTerm: {} },
  units: { distance: "kilometres", weight: "kilograms", height: "centimetres", temperature: "celsius", energy: "kcal", pace: "min/km", speed: "km/h" },
  workout: { autoStartDetection: false, autoPause: true, voiceFeedback: false, audioLanguage: "English", musicPriority: "workout", captions: true, hapticFeedback: true, metrics: { heartRate: true, pace: true, distance: true, calories: true, cadence: false, elevation: false, burnBar: false }, equipment: {} },
  wellness: { sleep: true, nutrition: true, mindfulness: false },
  coachingAI: { adaptiveTraining: true, difficultyAutoAdjustment: true, injuryRecoveryMode: false, aiNutritionSuggestions: true, aiSleepOptimisation: true, weeklyTrainingPlan: true },
  socialCommunity: { friendsAndGroups: true, groupVisibility: "friends", challengeParticipation: true, leaderboardPrivacy: true, automaticallyShareWorkouts: false, shareAchievements: false, shareRoutes: false, visibility: { friends: false, local: false, state: false, national: false, global: false } },
  notifications: { workoutNotifications: true, healthNotifications: true, mealLoggingReminders: false, motivationalMessages: true, appNotifications: true },
  privacyPermissions: { activityTracking: false, foregroundLocation: false, heartRateAccess: false, sleepTracking: false, menstrualCycleTracking: false, stressSpO2EcgAccess: false, appleHealth: false, androidHealth: false, wearableSync: false, publicProfile: false, leaderboardVisibility: false, routeSharing: false, friendDiscovery: false },
  app: { theme: "system", textSize: "standard", reducedMotion: false, highContrast: false, screenReaderImprovements: true, language: "English", offlineData: true, cacheManagement: "automatic", diagnostics: false },
};

const text = z.string().max(1000).optional();
export const userSettingsSchema = z.object({
  profileHealth: z.object({ profilePhotoUri: text, emergencyContact: text, dateOfBirth: text, gender: text, fitnessLevel: text, activityType: text, restingHeartRate: z.number().min(20).max(240).optional(), maximumHeartRate: z.number().min(80).max(240).optional(), vo2Max: z.number().min(5).max(100).optional(), bodyFatPercentage: z.number().min(1).max(70).optional(), medicalConditions: text, wheelchairMode: z.boolean().optional(), pregnancyMode: z.boolean().optional() }).strict(),
  goals: z.object({ daily: z.record(z.string(), z.union([z.number().min(0).max(100000), z.boolean()])).default({}), weekly: z.record(z.string(), z.number().min(0).max(100000)).default({}), longTerm: z.record(z.string(), z.union([z.string().max(1000), z.number().min(0).max(100000)])).default({}) }).strict(),
  units: z.object({ distance: z.enum(["kilometres", "miles"]), weight: z.enum(["kilograms", "pounds"]), height: z.enum(["centimetres", "feet-inches"]), temperature: z.enum(["celsius", "fahrenheit"]), energy: z.enum(["kcal", "kJ"]), pace: z.enum(["min/km", "min/mile"]), speed: z.enum(["km/h", "mph"]) }).strict(),
  workout: z.object({ autoStartDetection: z.boolean(), autoPause: z.boolean(), voiceFeedback: z.boolean(), audioLanguage: z.string().max(80), musicPriority: z.enum(["workout", "music"]), captions: z.boolean(), hapticFeedback: z.boolean(), metrics: z.record(z.string(), z.boolean()), equipment: z.record(z.string(), text) }).strict(),
  wellness: z.object({ sleep: z.boolean(), nutrition: z.boolean(), mindfulness: z.boolean() }).strict(),
  coachingAI: z.object({ adaptiveTraining: z.boolean(), difficultyAutoAdjustment: z.boolean(), injuryRecoveryMode: z.boolean(), aiNutritionSuggestions: z.boolean(), aiSleepOptimisation: z.boolean(), weeklyTrainingPlan: z.boolean(), preferredWorkoutTypes: text, preferredTrainers: text, coachingStyle: text, humourLevel: text, musicGenres: text, equipmentAvailability: text }).strict(),
  socialCommunity: z.object({ friendsAndGroups: z.boolean(), blockedUsers: text, groupVisibility: z.enum(["friends", "local", "state", "national", "global"]), challengeParticipation: z.boolean(), leaderboardPrivacy: z.boolean(), automaticallyShareWorkouts: z.boolean(), shareAchievements: z.boolean(), shareRoutes: z.boolean(), visibility: z.object({ friends: z.boolean(), local: z.boolean(), state: z.boolean(), national: z.boolean(), global: z.boolean() }).strict() }).strict(),
  notifications: z.object({ workoutNotifications: z.boolean(), healthNotifications: z.boolean(), mealLoggingReminders: z.boolean(), motivationalMessages: z.boolean(), appNotifications: z.boolean() }).strict(),
  privacyPermissions: z.object({ activityTracking: z.boolean(), foregroundLocation: z.boolean(), heartRateAccess: z.boolean(), sleepTracking: z.boolean(), menstrualCycleTracking: z.boolean(), stressSpO2EcgAccess: z.boolean(), appleHealth: z.boolean(), androidHealth: z.boolean(), wearableSync: z.boolean(), connectedApps: text, publicProfile: z.boolean(), leaderboardVisibility: z.boolean(), routeSharing: z.boolean(), friendDiscovery: z.boolean() }).strict(),
  app: z.object({ theme: z.enum(["system", "light", "dark"]), textSize: z.enum(["standard", "large", "extra-large"]), reducedMotion: z.boolean(), highContrast: z.boolean(), screenReaderImprovements: z.boolean(), language: z.string().max(80), offlineData: z.boolean(), cacheManagement: z.enum(["automatic", "manual"]), diagnostics: z.boolean() }).strict(),
}).strict();
