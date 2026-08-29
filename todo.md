# Project TODO

- [x] Establish PulseCoach visual system and iPhone-first navigation
- [x] Build Today dashboard with data availability states
- [x] Build voice Coach screen with listening, transcript, and response states
- [x] Add local coaching prompt flows for nutrition and workout guidance
- [x] Build Nutrition screen with meal suggestions and food logging prototype
- [x] Build Workout screen with exercise suggestions and substitutions
- [x] Build Workout session screen with set tracking and rest timer
- [x] Build Apple Health permission and connection-state experience
- [x] Add local preferences for goals, dietary constraints, equipment, and limitations
- [x] Add local workout history and progress summary
- [x] Add safety language and avoid medical or fabricated health claims
- [x] Generate and apply a unique PulseCoach app logo before first delivery checkpoint
- [x] Add deterministic tests for core coaching and health-state behavior
- [x] Run TypeScript, lint, and test validation
- [x] Review the prototype on the live preview and prepare next-step native HealthKit work

## Expanded gym-coaching scope

- [x] Add camera capture flow for identifying workout machines
- [ ] Add AI machine analysis with primary muscles, setup steps, and safe-use cues
- [x] Add exercise detail screen with target muscles, equipment, form cues, and substitutions
- [x] Add manual weight, reps, sets, duration, and cardio logging
- [x] Add local workout history with last-used weight and exercise progression recommendations
- [x] Add progressive-overload rules with conservative increases and user confirmation
- [x] Add voice-controlled set start, rep/session guidance, pause, and rest timer
- [x] Add calories-burned view with manual strength/cardio activity entries
- [ ] Add step-counter data state and Apple Health synchronization state
- [x] Add pre-workout warm-up and post-workout cooldown/stretch suggestions
- [x] Add free-weight form education with clear cues and safety disclaimers
- [x] Add camera, microphone, motion, and health permission explanations for iPhone
- [x] Add deterministic tests for logging, progression, calorie estimates, and rest timing
- [x] Re-test expanded flows on the live preview and prepare native camera, speech, motion, and HealthKit work

## Supplement, recipe, and peptide education scope

- [x] Add supplement cabinet with protein powder, pre-workout, vitamins, serving size, quantity, and expiry fields
- [x] Add supplement timing planner with configurable morning, pre-workout, post-workout, and evening slots
- [x] Add calorie-aware protein powder and food timing context without prescribing medical treatment
- [x] Add rotating motivational messages on the Today screen
- [x] Add pantry ingredient entry and saved household ingredients
- [x] Add healthy recipe suggestions based on available pantry ingredients and user preferences
- [x] Add recipe detail with ingredients, preparation steps, servings, and estimated nutrition
- [x] Add peptide tracker as a private record of user-entered names and notes
- [x] Add peptide educational library and question-based information search with source/date labeling
- [x] Add prominent peptide safety boundary: no individualized peptide selection, dosing, reconstitution, or injection-unit calculations
- [x] Add deterministic tests for supplement timing, pantry matching, motivation rotation, and peptide safety copy

## Training plan, injury, and research-tool scope

- [x] Add weekly workout schedule for 1–7 training days
- [x] Add body-part or training-focus assignment for each planned day
- [x] Add training diary showing planned, completed, skipped, and modified sessions
- [x] Add injury and limitation notes with body area, date, status, and clinician guidance field
- [x] Add conservative exercise flags and alternatives based on entered limitations
- [x] Add warm-up and cooldown library with muscle-area filters and stop/modify cues
- [x] Add searchable neutral peptide library with education, evidence status, risks, and sources
- [x] Add peptide research-question search without goal-based peptide recommendations
- [x] Add clinician-instruction record for peptide details without calculating dose, mixing, or injection units
- [x] Add searchable workout-supplement research library with label, evidence, stimulant, and safety context
- [x] Add clinician-question prompts for peptide and supplement decisions
- [x] Add deterministic tests for schedule generation, diary states, injury flags, and research-tool safety boundaries

## Scanning, progress, activity, and social scope

- [x] Add supplement barcode scanning and label/photo capture entry flow
- [x] Add nutrition food barcode and meal/photo capture entry flow
- [x] Add product detail cards with serving size, calories, protein, fat, sugar, ingredients, allergens, and confidence/source labels
- [x] Add transparent product comparisons based on goals and preferences without medical healing claims
- [ ] Add large searchable food and supplement catalog using a licensed or public data source
- [x] Add BMI calculator with clear limitations and metric/imperial units
- [x] Add daily water-intake target and manual hydration logging
- [x] Add weight logging with trend charts and privacy controls
- [x] Add run, walk, and cycle tracking with route breadcrumb map
- [x] Add active/inactive time-of-day summary with Apple Health and motion-data states
- [x] Add privacy controls for route retention, friend visibility, and sharing scope
- [x] Add friends with day/week/month activity summaries
- [x] Add virtual competitions, points, badges, and non-monetary challenge stakes
- [x] Add age/region/legal gating before considering any real-money wager capability
- [x] Add deterministic tests for BMI, hydration, product parsing, progress trends, route privacy, and challenge scoring

## Goal weight, activity maps, and blind competitions

- [x] Add current-weight and goal-weight fields with editable units
- [x] Add pace selector with cautious, steady, and slower options plus transparent trade-offs
- [x] Add goal progress chart and non-scale habit suggestions
- [x] Add safe weight-loss guidance that avoids crash-diet framing and flags clinician support when appropriate
- [x] Move run, walk, and cycle entry points into the Workout section
- [x] Add an always-available daily route map with active and inactive periods
- [x] Keep an explicitly started run, walk, or cycle workout as a separate session record
- [x] Add competition creation with invited friends and day/week/month duration
- [x] Add selectable healthy competition metrics such as steps, distance, active calories, workouts, active minutes, and weight trend
- [x] Add hidden live standings during weekly or monthly competitions
- [x] Add final results reveal and winner announcement to the group when a competition ends
- [x] Add deterministic tests for goal pace, activity session separation, blind standings, and final scoring

## Friend-specific privacy controls

- [x] Add per-friend sharing setup when sending or accepting a friend invite
- [x] Add independent permissions for weight trend, BMI, steps, workouts, active minutes, calories, nutrition progress, and route breadcrumbs
- [x] Keep all categories private by default for new friends
- [x] Add per-friend edit, revoke, and review controls
- [x] Show a clear preview of exactly what each friend can see
- [x] Ensure competitions only expose the selected competition metric and respect each friend’s sharing choices
- [x] Add deterministic tests for private defaults, category toggles, revocation, and competition visibility

## Login, administration, and continuous feedback

- [x] Add startup authentication gate before entering the app
- [x] Add sign-in, sign-out, session loading, and account states
- [ ] Choose and configure a production identity provider, with Apple sign-in as the iPhone-first option
- [x] Add owner-only admin role and protected admin navigation
- [x] Add admin overview for user count, active users, retention, feature adoption, and feedback trends
- [x] Keep admin analytics aggregated and avoid exposing individual health values by default
- [ ] Add data retention, deletion, export, and privacy policy entry points
- [x] Add Profile feedback box for feature suggestions, changes, and issue reports
- [ ] Add feedback category, description, optional contact permission, and submission confirmation
- [ ] Add admin feedback inbox with status and triage labels
- [x] Add deterministic tests for auth gating, admin authorization, aggregate analytics, and feedback submission

## Multi-provider authentication

- [x] Add Create account entry point alongside sign-in
- [x] Add Google login option
- [x] Add Facebook login option
- [x] Add Apple login option for iPhone users
- [x] Add standalone email/password account creation and sign-in
- [ ] Add password reset, email verification, and sign-out states
- [x] Add provider account-linking flow to prevent duplicate user profiles
- [x] Add clear consent and privacy messaging for account and health-data use
- [ ] Add provider-specific configuration checklist and redirect URL handling
- [x] Add deterministic tests for login choices, create-account validation, provider errors, and identity linking

## Preview authentication-loop fix

- [x] Stop unauthenticated preview sessions from redirecting back to login while inspecting the app
- [x] Preserve real native iPhone startup authentication behavior
- [x] Provide a clearly labeled preview/demo access state with no real user health data
- [x] Verify login route, app routes, and sign-out behavior after the fix

## Attached implementation prompt reconciliation

- [x] Review PulseCoach_Manus_Implementation_Prompt.md against the current project
- [x] Map prompt requirements to existing screens, helpers, tests, and native follow-ups
- [x] Add unchecked items for every prompt requirement not yet implemented
- [ ] Implement the missing prompt requirements without weakening health, privacy, or authentication safeguards
- [x] Run validation and save a prompt-aligned checkpoint

## Prompt audit gaps

- [ ] Add persistent relational schema and migrations for profiles, goals, privacy, permissions, friendships, machines, exercises, plans, sessions, sets, activity, routes, foods, scans, meals, supplements, challenges, notifications, and device tokens
- [ ] Add authenticated tRPC procedures with ownership checks, validation, transactions, and user-isolated queries
- [ ] Replace hard-coded social, workout, scan, wellness, schedule, and progress data with database-backed data while preserving labeled demo mode for preview
- [ ] Complete friend invitation, acceptance, decline, cancellation, removal, blocking, username search, profile visibility, and server-enforced sharing
- [ ] Complete challenge invitations, start times, Australia/Sydney boundaries, server-calculated scores, deduplication, standings, results, badges, and notifications
- [ ] Add a common HealthKit service interface with real iPhone development-build integration and explicit permission states
- [ ] Add foreground/background location tracking, route simplification, pause/resume/delete/retention, privacy trimming, and native map rendering
- [ ] Add durable Run/Walk/Cycle GPS sessions with background recovery, pace/speed, heart-rate freshness, audio updates, and edit-after-finish
- [ ] Add real native speech recognition with command aliases, transcripts, confidence confirmation, background-safe rest timestamps, and local rest notifications
- [ ] Add common wearable interface, Apple Watch companion extension points, phone/watch sync and duplicate-event reconciliation
- [ ] Make workout recommendations use goals, recovery, history, machines, RPE, limitations, activity load, and schedule
- [ ] Add Australian defaults, Sydney timezone handling, configurable units, notification preferences, privacy retention, export, and deletion flows
- [ ] Add prompt acceptance tests for cross-user isolation, sync deduplication, permission states, route retention, voice confidence, timer accuracy, wearable freshness, and native limitations

## Prompt foundation milestone

- [x] Create first prompt-aligned foundation checkpoint with additive schema migration, authenticated profile/goal/feedback APIs, ownership-scoped procedures, and source-aware audit notes

## Pasted implementation brief

- [ ] Read pasted_content.txt and reconcile its requirements with PulseCoach
- [ ] Add specific unchecked items for each new requirement from the pasted brief
- [ ] Implement the pasted brief without removing existing functionality or weakening safety/privacy controls
- [x] Validate the resulting flows and save a checkpoint

## Food accuracy and workout selection brief

- [ ] Add source-aware food resolution adapters for Open Food Facts, FSANZ/AUSNUT, USDA FoodData Central, NIH supplement labels, and private confirmed entries
- [ ] Store source IDs, country, verification date, quality flags, variants, barcodes, images, nutrients, serving options, ingredients, and allergens
- [x] Add barcode, package photo, nutrition-panel photo, ingredients-panel photo, text search, voice search, manual entry, recent, favourites, saved, and copied-meal entry modes
- [ ] Add ranked exact-match and OCR fallback flow with confidence and explicit confirmation
- [x] Add editable portions for serves, grams, millilitres, package fractions, and custom portions with normalized nutrient recalculation
- [ ] Add food history, saved meals, weekly averages, reminders, and export-ready nutrition totals
- [ ] Add supplement active-ingredient, caffeine, allergen, label-direction, batch, expiry, serving, inventory, and duplicate-ingredient handling
- [x] Add Choose today’s workout flow with primary focus, secondary muscles, time, equipment, style, readiness, and today’s limitation
- [x] Regenerate focus-specific workout plans and offer continue, save partial, or discard choices when switching after completed sets
- [ ] Add stored muscle metadata and accessible front/back workout diagrams with text alternatives
- [ ] Add curated exercise instruction asset metadata, license/source fields, previous performance, settings, and substitutions
- [x] Add prompt acceptance tests for product variants, OCR confidence, portions, unit conversion, duplicate caffeine, workout switching, and muscle metadata

## Pasted brief milestone

- [x] Read pasted_content.txt and reconcile its requirements with PulseCoach
- [x] Add specific unchecked items for each new requirement from the pasted brief
- [x] Implement source-aware barcode lookup prototype, transparent review states, confirmed-portion recalculation, and focus-specific Workout selection
- [x] Add deterministic product-resolution and workout-selection coverage

## Pasted content 2: nutrition and supplement usability

- [ ] Add Nutrition-tab entry cards for food search, barcode scan, and photo capture
- [ ] Add live search suggestions for food, product, brand, restaurant food, ingredients, meals, and drinks
- [ ] Add product result rows with image, serving, calories/kilojoules, protein, source, recent, and favourite states
- [ ] Add an editable food-details step before saving any selected item
- [ ] Add meal category, serving, gram, millilitre, unit, package fraction, custom portion, date/time, and notes controls
- [ ] Add instant nutrient recalculation for confirmed amounts, including sodium versus calculated salt distinction
- [ ] Add edit, move, duplicate, delete, favourite, copied-meal, recent, custom-food, and custom-meal actions
- [ ] Add permanent Breakfast, Lunch, Dinner, and Snacks sections with per-meal totals and add-food actions
- [ ] Add daily calories/kilojoules, remaining energy, macro, fibre, sugar, saturated-fat, sodium, and water summary with breakdown navigation
- [ ] Add weekly averages, reminders, export-ready totals, and no-AI nutrient calculation rule
- [ ] Add Supplements-tab search with product, brand, flavour, image, serving, active ingredients, protein, calories, caffeine, source, loading, empty, and error states
- [ ] Add supplement confirmation, cabinet, schedule, taken log, servings remaining, batch, expiry, ingredients, allergens, warnings, and nutrition-diary linking
- [ ] Prevent double-counting protein powder or mass-gainer nutrition across Supplements and Nutrition
- [ ] Add typo-tolerant autocomplete, provider-backed search, recent/favourites/history, and manual fallback
- [ ] Add acceptance tests for search, Australian ranking, amount editing, meal totals, deletion, copying, supplement serving totals, duplicate prevention, persistence, and phone layout

## Pasted content 2 milestone

- [x] Audit pasted_content_2.txt against current Nutrition and Supplements flows
- [x] Add entry cards for Nutrition search, barcode, and photo actions
- [x] Add entry cards for Supplement search, barcode, and label-photo actions
- [x] Add phone-sized food and supplement result states with source/confidence messaging
- [x] Add permanent meal-section UI and daily nutrient summary UI
- [x] Add deterministic portion recalculation and server-side exact-barcode lookup foundation
- [x] Add fast Nutrition and Supplements interface review with TypeScript, lint, and automated tests

## Pasted content 3 implementation

- [x] Read pasted_content_3.txt and compare it with the current PulseCoach build
- [x] Add specific unchecked items for every new requirement in the brief
- [ ] Implement the brief without removing current features or weakening safety, privacy, and authentication controls
- [ ] Run validation, review the preview, and save a checkpoint

## Physical iPhone and TestFlight readiness

- [x] Audit every current feature into ready, native/configuration, demo, blocked, or not implemented categories
- [ ] Verify unique production iOS bundle identifier and EAS project configuration
- [x] Add explicit preview and production build profiles with version/build-number policy
- [x] Prepare Apple sign-in, HealthKit, camera/barcode, microphone/speech, location, motion, notifications, and background-mode configuration
- [x] Ensure mobile code contains no API secrets and route provider calls through the server
- [ ] Replace or label remaining hard-coded demonstration data and unavailable native states
- [ ] Verify production database, file/image storage, food/supplement providers, map provider, privacy policy, deletion, monitoring, and beta feedback links
- [x] Run TypeScript, lint, tests, migrations, production build validation, authentication, and user-isolation checks
- [x] Prepare an EAS/TestFlight handoff guide without publishing or submitting on the user’s behalf
- [x] Write a physical-device test checklist and bug-report/screenshot workflow

## Standalone Expo ZIP authentication repair

- [x] Audit constants/oauth.ts, auth hooks, and server auth for ZIP portability
- [x] Add safe exportable client environment values without private server secrets
- [x] Verify the configured API base URL is publicly reachable for a physical iPhone
- [ ] Replace or isolate preview-only Manus authentication if standalone auth cannot work
- [x] Validate the standalone iOS configuration and package a new downloadable ZIP


## Managed public configuration and standalone ZIP

- [x] Retrieve current safe public OAuth and API values from managed project configuration
- [x] Determine whether the current preview API host is stable and reachable from a physical iPhone
- [x] Determine whether Manus OAuth is usable in a standalone Expo iOS build
- [ ] Establish a stable backend path if the managed preview host is not suitable
- [x] Add usable public client configuration documentation without private secrets
- [x] Run auth/configuration tests and package a new safe Download as ZIP version


## Local authentication-flow verification

- [x] Test absolute OAuth URL construction with exported-app defaults
- [x] Test local API reachability and expected unauthenticated session response
- [x] Confirm the original Invalid URL issue is resolved and document any device-only limitations


## Persistent backend deployment requirement

- [ ] Audit whether the managed project can provide persistent backend hosting after this task ends
- [ ] Do not test or reuse temporary session preview endpoints for the standalone iPhone build
- [ ] Prepare production-safe backend deployment handoff without exposing server secrets
- [ ] Update the client API base URL only after a user-controlled persistent HTTPS deployment exists
- [ ] Verify `/api/auth/me` against the persistent deployment after publication
- [ ] Provide an updated standalone-public.env file containing the confirmed stable URL


## Manual EAS Update configuration and App Store build retry

- [x] Add top-level runtimeVersion policy appVersion to app.config.ts
- [x] Add top-level EAS Updates URL to app.config.ts
- [x] Preserve the existing extra.eas.projectId value
- [x] Validate the resolved Expo config and checkpoint the change
- [ ] Retry the iOS production/App Store build without submitting it


## Permanent backend host verification

- [x] Verify whether the published PulseCoach domain is a persistent HTTPS backend host
- [x] Confirm `/api/auth/me` reachability without using a task-scoped preview URL
- [x] Update EXPO_PUBLIC_API_BASE_URL only after permanent-host verification
- [x] Confirm all six public variables across development, preview, and production configuration
- [x] Provide updated standalone-public.env and physical-iPhone login instructions
- [x] Do not start Expo, EAS, App Store, or TestFlight builds until user approval


## Permanent URL and managed-value completion

- [ ] Confirm permanent published URL is https://pulsecoach-ckxq3prl.manus.space
- [ ] Populate all six public variables from managed configuration without user input cards
- [ ] Keep the published hostname visible in the client API variable
- [ ] Verify `/api/auth/me` on the published host and repeat after service/task completion where possible
- [ ] Report masked public values and explicitly avoid another app build


## Interactive controls and speech recognition

- [x] Replace Coach fake listening toggle with expo-speech-recognition SDK 54 integration
- [x] Add speech-recognition config plugin and clear iOS permission descriptions
- [x] Handle permission, start, result, end, error, stop, and unavailable states
- [x] Populate and preserve recognized speech in the Coach prompt field for editing/submission
- [x] Connect Activity Cardio and Walk controls to intended navigation or activity-start flows with visible feedback
- [x] Run TypeScript, lint, tests, and Expo Doctor without starting an EAS/App Store build


## Pasted content 4: production Apple Health integration

- [x] Audit the current Movement screen, HealthKit library, app config, entitlements, and permission descriptions
- [x] Replace temporary/local HealthKit connection state with real authorization-aware persistence
- [x] Add launch and foreground HealthKit initialization with accurate connection states
- [x] Request only required read permissions for steps, distance, active energy, exercise, workouts, heart-rate summaries, weight, and optional sleep
- [x] Add current-day, daily, weekly, and monthly aggregation with timezone/DST handling and overlap-safe source deduplication
- [x] Add persisted last-successful sync data, catch-up sync, retry, Sync now, and meaningful failure states
- [x] Add real movement summaries, charts, source/last-updated metadata, and no-fake-zero states
- [x] Add disconnect, imported-data deletion, category permission controls, and Health settings guidance
- [x] Keep health data user-isolated and excluded from AI Coach unless explicitly opted in
- [x] Add automated date-boundary, aggregation, deduplication, and persisted-sync tests
- [x] Run TypeScript, lint, tests, and Expo Doctor; fix relevant Doctor issues
- [x] Do not start EAS Build until the requested report is delivered


## Apple Health completion pass

- [x] Add independent enable controls for steps, walking/running distance, active energy, exercise time, workouts, heart-rate summaries, body mass, and optional sleep
- [x] Request only enabled HealthKit categories and explain Apple-managed permission disclosure limits
- [x] Add anchored/incremental query state and safe fallback catch-up sync
- [x] Add HealthKit change observers/background delivery where supported by the selected library
- [x] Add diagnostics for categories, sync attempts, successful sync, record count, cache age, and non-sensitive errors
- [x] Strengthen disconnect/delete confirmation and Health settings revocation guidance
- [x] Verify authenticated-user isolation for all cached snapshots
- [x] Resolve the two navigation dependency advisories with Expo-compatible versions
- [x] Reach 18/18 Expo Doctor checks before any build
- [x] Run TypeScript, lint, full tests, and HealthKit aggregation/deduplication tests
- [x] Do not start EAS Build


## Movement and Apple Health navigation

- [x] Separate Movement from Apple Health settings; route Movement to Activity and add Profile → Settings → Apple Health management.


## Live food and supplement catalogue phase 1

- [x] Rank Australian Open Food Facts matches ahead of global products
- [x] Use live catalogue search in both Nutrition and Supplements
- [x] Display product image, brand, serving nutrition, source, and retailer metadata where available
- [x] Filter products without usable names or calorie data instead of inventing values
- [x] Add deterministic catalogue ranking, serving, filtering, and supplement classification tests
- [ ] Connect an additional authoritative generic-food source and a specialist supplement-label source
- [ ] Add persistent favourites, recent searches, cabinet inventory, and confirmed product history
