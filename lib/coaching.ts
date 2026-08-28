export type Goal = "strength" | "fitness" | "maintenance";

export function nutritionPrompt(goal: Goal, vegetarian: boolean) {
  const protein = vegetarian ? "beans, tofu, lentils, eggs, or yoghurt" : "fish, eggs, yoghurt, chicken, tofu, or beans";
  if (goal === "strength") return `Build a satisfying plate around ${protein}, colourful plants, and a carbohydrate that supports training.`;
  if (goal === "fitness") return `Choose ${protein}, add colourful plants, and include enough carbohydrate and fluid to support your activity.`;
  return `Start with ${protein}, vegetables, and a satisfying portion that matches your hunger.`;
}

export function workoutFocus(goal: Goal, equipment: "dumbbells" | "full-gym" | "bodyweight") {
  const base = equipment === "bodyweight" ? "push, pull, squat, hinge, and carry patterns" : "a push, a pull, a squat or hinge, and a core movement";
  return goal === "strength" ? `Prioritise controlled reps and longer rests across ${base}.` : `Keep the session focused and repeatable with ${base}.`;
}

export function healthConnectionLabel(connected: boolean) {
  return connected ? "Apple Health connected" : "Connect Apple Health";
}
