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
