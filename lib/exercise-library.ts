export type MuscleGroup = "Full body" | "Chest" | "Back" | "Shoulders" | "Arms" | "Legs" | "Core";
export type ExerciseEquipment = "Bodyweight" | "Dumbbells" | "Full gym";

export type ExerciseLibraryItem = {
  id: string;
  name: string;
  muscleGroup: Exclude<MuscleGroup, "Full body">;
  equipment: ExerciseEquipment[];
  focus: string;
};

const item = (id: string, name: string, muscleGroup: ExerciseLibraryItem["muscleGroup"], equipment: ExerciseEquipment[], focus: string): ExerciseLibraryItem => ({ id, name, muscleGroup, equipment, focus });

export const EXERCISE_LIBRARY: ExerciseLibraryItem[] = [
  item("chest-push-up", "Push-up", "Chest", ["Bodyweight", "Dumbbells", "Full gym"], "Chest + triceps"),
  item("chest-wide-push-up", "Wide push-up", "Chest", ["Bodyweight", "Dumbbells", "Full gym"], "Outer chest"),
  item("chest-incline-push-up", "Incline push-up", "Chest", ["Bodyweight", "Dumbbells", "Full gym"], "Chest"),
  item("chest-decline-push-up", "Decline push-up", "Chest", ["Bodyweight", "Dumbbells", "Full gym"], "Upper chest"),
  item("chest-db-floor", "Dumbbell floor press", "Chest", ["Dumbbells", "Full gym"], "Chest + triceps"),
  item("chest-db-bench", "Dumbbell bench press", "Chest", ["Dumbbells", "Full gym"], "Chest"),
  item("chest-db-incline", "Incline dumbbell press", "Chest", ["Dumbbells", "Full gym"], "Upper chest"),
  item("chest-db-fly", "Dumbbell fly", "Chest", ["Dumbbells", "Full gym"], "Chest"),
  item("chest-bench", "Barbell bench press", "Chest", ["Full gym"], "Chest + triceps"),
  item("chest-incline-bench", "Incline barbell bench press", "Chest", ["Full gym"], "Upper chest"),
  item("chest-machine", "Machine chest press", "Chest", ["Full gym"], "Chest"),
  item("chest-cable-fly", "Cable fly", "Chest", ["Full gym"], "Chest"),
  item("chest-pec-deck", "Pec deck", "Chest", ["Full gym"], "Chest"),

  item("back-superman", "Superman hold", "Back", ["Bodyweight", "Dumbbells", "Full gym"], "Lower back"),
  item("back-prone-y", "Prone Y raise", "Back", ["Bodyweight", "Dumbbells", "Full gym"], "Upper back"),
  item("back-db-row", "Single-arm dumbbell row", "Back", ["Dumbbells", "Full gym"], "Lats + upper back"),
  item("back-db-pullover", "Dumbbell pullover", "Back", ["Dumbbells", "Full gym"], "Lats"),
  item("back-renegade", "Renegade row", "Back", ["Dumbbells", "Full gym"], "Back + core"),
  item("back-pulldown", "Lat pulldown", "Back", ["Full gym"], "Lats"),
  item("back-seated-row", "Seated cable row", "Back", ["Full gym"], "Mid back"),
  item("back-assisted-pullup", "Assisted pull-up", "Back", ["Full gym"], "Lats + biceps"),
  item("back-pullup", "Pull-up", "Back", ["Full gym"], "Lats + biceps"),
  item("back-tbar", "T-bar row", "Back", ["Full gym"], "Mid back"),
  item("back-barbell-row", "Barbell bent-over row", "Back", ["Full gym"], "Back"),
  item("back-machine-row", "Machine row", "Back", ["Full gym"], "Upper back"),

  item("shoulder-pike", "Pike push-up", "Shoulders", ["Bodyweight", "Dumbbells", "Full gym"], "Shoulders"),
  item("shoulder-wall-walk", "Wall walk", "Shoulders", ["Bodyweight", "Dumbbells", "Full gym"], "Shoulders + core"),
  item("shoulder-db-press", "Dumbbell shoulder press", "Shoulders", ["Dumbbells", "Full gym"], "Shoulders"),
  item("shoulder-arnold", "Arnold press", "Shoulders", ["Dumbbells", "Full gym"], "Shoulders"),
  item("shoulder-lateral", "Dumbbell lateral raise", "Shoulders", ["Dumbbells", "Full gym"], "Side delts"),
  item("shoulder-front", "Dumbbell front raise", "Shoulders", ["Dumbbells", "Full gym"], "Front delts"),
  item("shoulder-rear", "Bent-over rear-delt raise", "Shoulders", ["Dumbbells", "Full gym"], "Rear delts"),
  item("shoulder-machine", "Machine shoulder press", "Shoulders", ["Full gym"], "Shoulders"),
  item("shoulder-cable-lateral", "Cable lateral raise", "Shoulders", ["Full gym"], "Side delts"),
  item("shoulder-face-pull", "Cable face pull", "Shoulders", ["Full gym"], "Rear delts"),

  item("arms-diamond", "Diamond push-up", "Arms", ["Bodyweight", "Dumbbells", "Full gym"], "Triceps"),
  item("arms-bench-dip", "Bench dip", "Arms", ["Bodyweight", "Dumbbells", "Full gym"], "Triceps"),
  item("arms-db-curl", "Dumbbell biceps curl", "Arms", ["Dumbbells", "Full gym"], "Biceps"),
  item("arms-hammer", "Hammer curl", "Arms", ["Dumbbells", "Full gym"], "Biceps + forearms"),
  item("arms-concentration", "Concentration curl", "Arms", ["Dumbbells", "Full gym"], "Biceps"),
  item("arms-overhead-triceps", "Dumbbell overhead triceps extension", "Arms", ["Dumbbells", "Full gym"], "Triceps"),
  item("arms-kickback", "Dumbbell triceps kickback", "Arms", ["Dumbbells", "Full gym"], "Triceps"),
  item("arms-cable-curl", "Cable biceps curl", "Arms", ["Full gym"], "Biceps"),
  item("arms-pushdown", "Cable triceps pushdown", "Arms", ["Full gym"], "Triceps"),
  item("arms-preacher", "Preacher curl", "Arms", ["Full gym"], "Biceps"),
  item("arms-dip-machine", "Assisted dip", "Arms", ["Full gym"], "Triceps"),
  item("arms-ez-curl", "EZ-bar curl", "Arms", ["Full gym"], "Biceps"),

  item("legs-squat", "Bodyweight squat", "Legs", ["Bodyweight", "Dumbbells", "Full gym"], "Quads + glutes"),
  item("legs-lunge", "Reverse lunge", "Legs", ["Bodyweight", "Dumbbells", "Full gym"], "Legs + balance"),
  item("legs-split", "Bulgarian split squat", "Legs", ["Bodyweight", "Dumbbells", "Full gym"], "Quads + glutes"),
  item("legs-glute-bridge", "Glute bridge", "Legs", ["Bodyweight", "Dumbbells", "Full gym"], "Glutes"),
  item("legs-calf", "Standing calf raise", "Legs", ["Bodyweight", "Dumbbells", "Full gym"], "Calves"),
  item("legs-goblet", "Dumbbell goblet squat", "Legs", ["Dumbbells", "Full gym"], "Quads + core"),
  item("legs-db-rdl", "Dumbbell Romanian deadlift", "Legs", ["Dumbbells", "Full gym"], "Hamstrings + glutes"),
  item("legs-db-step", "Dumbbell step-up", "Legs", ["Dumbbells", "Full gym"], "Quads + glutes"),
  item("legs-leg-press", "Leg press", "Legs", ["Full gym"], "Quads + glutes"),
  item("legs-hack", "Hack squat", "Legs", ["Full gym"], "Quads"),
  item("legs-extension", "Leg extension", "Legs", ["Full gym"], "Quads"),
  item("legs-curl", "Seated leg curl", "Legs", ["Full gym"], "Hamstrings"),
  item("legs-barbell-squat", "Barbell back squat", "Legs", ["Full gym"], "Legs + core"),
  item("legs-hip-thrust", "Barbell hip thrust", "Legs", ["Full gym"], "Glutes"),

  item("core-plank", "Front plank", "Core", ["Bodyweight", "Dumbbells", "Full gym"], "Core"),
  item("core-side-plank", "Side plank", "Core", ["Bodyweight", "Dumbbells", "Full gym"], "Obliques"),
  item("core-dead-bug", "Dead bug", "Core", ["Bodyweight", "Dumbbells", "Full gym"], "Deep core"),
  item("core-bird-dog", "Bird dog", "Core", ["Bodyweight", "Dumbbells", "Full gym"], "Core + stability"),
  item("core-mountain", "Mountain climber", "Core", ["Bodyweight", "Dumbbells", "Full gym"], "Core + conditioning"),
  item("core-crunch", "Crunch", "Core", ["Bodyweight", "Dumbbells", "Full gym"], "Abdominals"),
  item("core-russian", "Dumbbell Russian twist", "Core", ["Dumbbells", "Full gym"], "Obliques"),
  item("core-suitcase", "Suitcase carry", "Core", ["Dumbbells", "Full gym"], "Core + grip"),
  item("core-cable-crunch", "Cable crunch", "Core", ["Full gym"], "Abdominals"),
  item("core-pallof", "Pallof press", "Core", ["Full gym"], "Anti-rotation core"),
];

export function exercisesFor(muscleGroup: MuscleGroup, equipment: ExerciseEquipment) {
  return EXERCISE_LIBRARY.filter((exercise) =>
    (muscleGroup === "Full body" || exercise.muscleGroup === muscleGroup) &&
    exercise.equipment.includes(equipment),
  );
}
