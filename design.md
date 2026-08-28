# PulseCoach Interface Design

## Product direction

PulseCoach is an iPhone-first, voice-forward wellness coach that helps a person understand today’s energy, nutrition, and training needs. The first prototype prioritizes a calm, encouraging coaching experience over dense dashboards. It is designed for portrait orientation and one-handed use, with a persistent voice action available from the main experience.

The coach should provide general wellness guidance, not diagnose conditions or replace a qualified clinician. Nutrition and exercise suggestions should be framed as adaptable options and should ask for relevant constraints such as injuries, allergies, dietary preferences, pregnancy, or medical restrictions before making personalized recommendations.

## Screen list

| Screen | Primary content and functionality |
|---|---|
| Today | Greeting, readiness snapshot, Apple Health connection state, progress rings for movement and nutrition, next best action, and a large “Talk to PulseCoach” control. |
| Coach | Voice conversation surface with transcript, listening/speaking state, suggested prompts, and quick actions such as “What should I eat?”, “Plan today’s workout”, and “Explain my progress.” |
| Nutrition | Calories and macro progress when available, nutrient gaps or goals, meal suggestions, quick food logging, and a “Build me a meal” action. Unknown data is shown as unavailable rather than fabricated. |
| Workout | Today’s training focus, suggested exercises, sets/reps/rest guidance, exercise substitutions, warm-up, and a start-workout flow. |
| Workout session | Large timer, current exercise, set tracking, rest control, form/safety reminder, and voice prompts so the user can keep their hands free. |
| Progress | Trends for activity, workouts, weight or body measurements only when the user chooses to share them, plus completed coaching actions. |
| Apple Health | Permission explanation, data categories requested, connection status, last sync, and controls to disconnect or change permissions. |
| Profile & preferences | Goals, experience level, dietary preferences, allergies, equipment, injuries or limitations, units, and coaching tone. |

## Key user flows

### First-run setup

1. The user opens PulseCoach and chooses a primary goal such as build strength, improve fitness, lose weight, or maintain health.
2. PulseCoach asks for experience level, dietary preferences, available equipment, and any injuries or restrictions.
3. The user sees exactly which Apple Health data categories are useful and why, then chooses whether to connect Apple Health.
4. The app lands on Today with a clear indication of which data is connected and which is still unavailable.

### Voice coaching

1. The user taps “Talk to PulseCoach” from Today or Coach.
2. The app shows a clear listening state and transcribes the user’s request.
3. PulseCoach interprets context such as recent activity, today’s goals, nutrition progress, and the selected workout focus.
4. The app responds in text and speech, with concise suggested actions and a way to correct assumptions.
5. The user can say or tap a follow-up such as “make it vegetarian,” “I only have dumbbells,” or “replace squats.”

### Nutrition guidance

1. The user asks what to eat or opens Nutrition.
2. The app identifies missing or lagging targets only from available user-provided or Apple Health-compatible data.
3. PulseCoach offers two or three practical meal options with portions, protein/fiber emphasis where relevant, substitutions, and a short reason for each recommendation.
4. The user can log a selected option, edit it, or ask for a cheaper, faster, vegetarian, or allergy-safe alternative.

### Workout guidance

1. The user says what they are training today, such as “upper body with dumbbells.”
2. PulseCoach checks goals, recent activity, equipment, experience, and recorded limitations.
3. The app proposes a warm-up and a compact exercise sequence with sets, reps, rest, and substitutions.
4. The user starts the session and tracks sets with large controls; voice commands can advance, repeat, pause, or replace an exercise.
5. The session ends with a summary and an optional save to the user’s local history.

### Apple Health connection

1. The user opens Apple Health or selects Connect Apple Health during setup.
2. The app explains that permissions are controlled by iOS and can be revoked in Apple Health settings.
3. The app requests only the minimum read permissions required for the prototype, such as steps, active energy, workouts, and heart-rate context if enabled.
4. The app displays connection status and last successful read, while gracefully falling back to manual input when permission is denied or data is unavailable.

## Visual and interaction language

PulseCoach uses a dark, high-contrast visual system intended for gym environments while retaining a clean iOS feel. The primary brand color is electric mint `#B8F36B`, used for progress, active controls, and coaching highlights. The background is deep graphite `#111513`; elevated cards use `#1B231D`; primary text is warm white `#F4F7F0`; secondary text is sage gray `#A8B3A6`; borders use `#2D392E`; and caution states use amber `#F6C453`.

The main voice control is a large rounded square or capsule near the lower portion of the screen so it can be reached with one hand. Primary actions use strong press feedback and restrained haptics. Cards are rounded but not overly decorative. Progress visuals are simple, legible, and labeled with actual data availability. Bottom-tab navigation should stay limited to Today, Coach, Nutrition, Workout, and Progress; secondary settings belong behind a top-right control or profile screen.

## MVP boundary

The first build should demonstrate Today, Coach, Nutrition, Workout, Apple Health connection state, local preferences, and a local workout history. The initial HealthKit implementation may require a native iOS development build rather than Expo Go; until that native capability is enabled, the interface should clearly label connection state and support deterministic demo data for interaction testing. Cloud accounts, social features, wearable-specific integrations, medical claims, and automated calorie prescriptions are out of scope for the first prototype.

## Expanded gym-coaching requirements

The gym flow now includes a camera entry point from Workout. A captured machine photo should lead to an analysis card that names likely primary muscles, explains the setup sequence, provides beginner-friendly form cues, offers substitutions, and asks the user to confirm the machine when visual confidence is low. The interface should make clear that photo analysis is a starting aid and that gym staff or a qualified professional may be the right source for unfamiliar equipment.

Each exercise detail and session screen should support weight, sets, reps, duration, and activity type. After saving, the app should show the most recent logged load and a conservative next-session suggestion. Progression should require user confirmation and prioritize repeatable technique over adding weight. The session screen should keep controls large enough for one-handed use, announce set completion and rest guidance aloud, and support future voice commands such as “start set,” “next set,” “pause,” and “replace exercise.”

The Activity screen should show steps and calories burned only when sourced from Apple Health or a user-entered activity. Manual entries should accept minutes, activity type, and optional calories, with strength, cardio, and walking as the first categories. The app should explain that calorie values are estimates and should not be framed as food compensation targets.

Workout guidance should include a short dynamic warm-up suggestion before training and gentle post-session mobility options afterward. Free-weight detail cards should emphasize stable setup, controlled range of motion, breathing, and stopping when pain or unusual symptoms occur. These cues are educational and should not promise injury prevention or diagnose a user’s movement.

## Supplement and recipe experience

A dedicated Supplements tab acts as a simple cabinet: users can record product names, serving notes, remaining quantity, expiry, and preferred timing. The first timing groups are morning, before workout, post-workout, and evening. Timing suggestions should remain label-aware and context-aware; the app should not infer that a supplement is medically necessary or appropriate for a condition, medication, pregnancy, or individual risk profile.

The Nutrition screen links to a Pantry Recipes flow. Users can add ingredients as removable chips, then browse recipe cards with prep time, approximate protein and nutrition context, servings, and a short preparation summary. The recipe experience should prefer realistic, balanced meals from available ingredients and keep calorie information visibly approximate.

The Today hero rotates through supportive messages while keeping the tone grounded and non-judgmental. The peptide area is an education and private-notes space, with source/date labels, a clear distinction between established evidence and early research, and a persistent boundary against individualized selection, dosing, vial reconstitution, or injection-unit calculations.
