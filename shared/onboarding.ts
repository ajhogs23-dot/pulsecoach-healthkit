import { z } from "zod";
export const FITNESS_GOALS = ["Lose fat", "Build muscle", "Improve strength", "Improve endurance", "Tone up", "Maintain weight", "General health"] as const;
export const ACTIVITY_LEVELS = ["Sedentary", "Lightly active", "Moderately active", "Very active", "Athlete"] as const;
export const WORKOUT_STYLES = ["Strength training", "Hypertrophy", "Powerlifting", "Cross-training", "Functional fitness", "Bodybuilding", "Cardio focus"] as const;
export const NUTRITION_OPTIONS = ["High protein", "Balanced", "Low carb", "Keto", "Vegan", "Vegetarian", "Gluten-free", "Dairy-free"] as const;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const INJURIES = ["Lower back", "Upper back", "Neck", "Shoulders", "Elbows", "Wrists / hands", "Knees", "Hips", "Ankles / feet", "Limited mobility", "Balance", "Recovery after surgery", "Other", "None"] as const;
export const SUPPLEMENTS = ["Protein", "Creatine", "Pre-workout", "Multivitamin", "Fish oil", "Other", "None"] as const;
export function ageFromBirthDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(value + "T12:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) return undefined;
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  if (now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())) age--;
  return age;
}
export const onboardingSchema = z.object({
  completed: z.boolean().default(false),
  termsAcceptance: z.object({version:z.string().max(50),acceptedAt:z.string().datetime()}).strict().optional(),
  dateOfBirth: z.string().refine(value => { const age=ageFromBirthDate(value); return age!==undefined && age>=18 && age<=120; }, "Enter a valid birth date (age 18–120)."),
  phone: z.string().max(30).refine(value => !value || /^\+[1-9]\d{7,14}$/.test(value), "Use your country code, for example +61412345678.").default(""),
  fitnessGoal: z.enum(FITNESS_GOALS), fitnessGoals: z.array(z.enum(FITNESS_GOALS)).max(7).default([]), activity: z.enum(ACTIVITY_LEVELS),
  experience: z.enum(["Beginner", "Intermediate", "Advanced"]), gymAccess: z.enum(["Yes", "No", "Home gym only"]),
  measurements: z.object({ waist: z.number().positive().max(300).optional(), hips: z.number().positive().max(300).optional(), chest: z.number().positive().max(300).optional(), arms: z.number().positive().max(150).optional(), thighs: z.number().positive().max(150).optional() }).strict().default({}),
  nutrition: z.array(z.enum(NUTRITION_OPTIONS)).max(8), intolerances: z.string().max(1000).default(""), religiousRestrictions: z.string().max(1000).default(""),
  timeline: z.enum(["4 weeks", "8 weeks", "12 weeks", "Ongoing"]), workoutStyle: z.enum(WORKOUT_STYLES), workoutStyles: z.array(z.enum(WORKOUT_STYLES)).max(7).default([]),
  trainingDays: z.array(z.enum(DAYS)).max(7), injuries: z.array(z.enum(INJURIES)).max(INJURIES.length), injuryNotes: z.string().max(600).default(""), supplements: z.array(z.enum(SUPPLEMENTS)).max(SUPPLEMENTS.length), otherSupplements: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  stepReminders: z.boolean().default(false), waterReminders: z.boolean().default(false),
  syncPreferences: z.array(z.enum(["Apple Health", "Google Fit", "Fitbit"])).max(3).default([]),
}).strict();
export type OnboardingPreferences = z.infer<typeof onboardingSchema>;
export const DEFAULT_ONBOARDING: OnboardingPreferences = {completed:false,dateOfBirth:"",phone:"",fitnessGoal:"General health",fitnessGoals:["General health"],activity:"Moderately active",experience:"Beginner",gymAccess:"Yes",measurements:{},nutrition:["Balanced"],intolerances:"",religiousRestrictions:"",timeline:"Ongoing",workoutStyle:"Strength training",workoutStyles:["Strength training"],trainingDays:[],injuries:["None"],injuryNotes:"",supplements:["None"],otherSupplements:[],stepReminders:false,waterReminders:false,syncPreferences:[]};
export function toggleExclusiveNone(values: string[], value: string) {
  if(value === "None") return ["None"];
  const next=values.filter(v=>v!=="None");
  return next.includes(value) ? next.filter(v=>v!==value) : [...next,value];
}
