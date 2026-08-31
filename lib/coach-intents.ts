export type CoachWorkoutFocus = "Chest" | "Back" | "Shoulders" | "Arms" | "Legs" | "Core" | "Cardio" | "Full body";

const focusPatterns: Array<[CoachWorkoutFocus, RegExp]> = [
  ["Chest", /\b(chest|pecs?|pectorals?)\b/i],
  ["Back", /\b(back|lats?)\b/i],
  ["Shoulders", /\b(shoulders?|delts?)\b/i],
  ["Arms", /\b(arms?|biceps?|triceps?)\b/i],
  ["Legs", /\b(legs?|quads?|hamstrings?|glutes?)\b/i],
  ["Core", /\b(core|abs?|abdominals?)\b/i],
  ["Cardio", /\b(cardio|run|running|walk|walking|cycle|cycling|bike)\b/i],
  ["Full body", /\b(full[ -]?body|whole body)\b/i],
];

export function workoutFocusFromPrompt(prompt: string): CoachWorkoutFocus | undefined {
  if (!/\b(workout|work out|train|training|exercise|gym)\b/i.test(prompt)) return undefined;
  return focusPatterns.find(([, pattern]) => pattern.test(prompt))?.[0];
}

export type CoachDestination = "run" | "walk" | "cycle" | "gym" | "nutrition" | "supplements" | "recipes" | "progress" | "history";
const destinations: [CoachDestination, RegExp][] = [
  ["run", /\b(start|open|track|begin).{0,18}\b(run|running)\b/i],
  ["walk", /\b(start|open|track|begin).{0,18}\b(walk|walking)\b/i],
  ["cycle", /\b(start|open|track|begin).{0,18}\b(cycle|cycling|bike ride)\b/i],
  ["gym", /\b(open|show|go to|take me to).{0,18}\b(gym|weights?|machines?)\b/i],
  ["nutrition", /\b(open|show|go to|take me to|log).{0,18}\b(nutrition|food|meal)\b/i],
  ["supplements", /\b(open|show|go to|take me to|log).{0,18}\b(supplements?|vitamins?)\b/i],
  ["recipes", /\b(open|show|find|go to|take me to).{0,18}\b(recipes?|pantry)\b/i],
  ["progress", /\b(open|show|check|go to|take me to).{0,18}\b(progress|this week|weekly progress)\b/i],
  ["history", /\b(open|show|check|go to|take me to).{0,18}\b(history|past workouts?|previous runs?)\b/i],
];
export const appDestinationFromPrompt = (prompt: string) => destinations.find(([, pattern]) => pattern.test(prompt))?.[0];
