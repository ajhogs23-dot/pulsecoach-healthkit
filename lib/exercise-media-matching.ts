const aliases: Record<string, string[]> = {
  "Barbell bench press": ["Bench press"],
  "Incline barbell bench press": ["Incline bench press"],
  "Machine chest press": ["Chest press"],
  "Pec deck": ["Butterfly"],
  "Single-arm dumbbell row": ["Dumbbell row", "One arm dumbbell row"],
  "Barbell bent-over row": ["Bent over row", "Barbell row"],
  "Dumbbell shoulder press": ["Shoulder press"],
  "Dumbbell biceps curl": ["Biceps curl", "Dumbbell curl"],
  "Cable triceps pushdown": ["Triceps pushdown"],
  "Bodyweight squat": ["Squat"],
  "Barbell back squat": ["Barbell squat", "Squat"],
  "Dumbbell Romanian deadlift": ["Romanian deadlift"],
  "Front plank": ["Plank"],
  "Captain's chair knee raise": ["Knee raise"],
};

const removableWords = /\b(barbell|dumbbell|cable|machine|smith|bodyweight|assisted|seated|standing|lying|incline|decline|single-arm|ez-bar)\b/gi;
const punctuation = /[^a-z0-9]+/g;

export function normaliseExerciseName(value: string) {
  return value.toLowerCase().replace(punctuation, " ").trim();
}

export function exerciseSearchTerms(exerciseName: string) {
  const simplified = exerciseName.replace(removableWords, " ").replace(/\s+/g, " ").trim();
  return [...new Set([exerciseName, ...(aliases[exerciseName] ?? []), simplified].filter((term) => term.length > 2))];
}

export function exerciseNameScore(requestedName: string, candidateName: string) {
  const requested = normaliseExerciseName(requestedName);
  const candidate = normaliseExerciseName(candidateName);
  if (!requested || !candidate) return 0;
  if (requested === candidate) return 100;
  if (requested.includes(candidate) || candidate.includes(requested)) return 80;
  const requestedTokens = new Set(requested.split(" "));
  const candidateTokens = new Set(candidate.split(" "));
  const shared = [...requestedTokens].filter((token) => candidateTokens.has(token)).length;
  return Math.round((shared / Math.max(requestedTokens.size, candidateTokens.size)) * 70);
}
