# Settings JSON Schema

`settings.schema.json` uses JSON Schema Draft 07. The document root validates the existing flat `ProfilePreferences` payload (30 properties). `personal-details.schema.json` is the named Personal Details entry point and references this canonical schema. It does not change storage or the API.

The `definitions` object contains the eight wireframe categories: `basicInformation`, `bodyDetails`, `goals`, `activityProfile`, `foodPreferences`, `trainingPreferences`, `coachingPreferences`, and `calorieTargets`. The flat `personalDetails` definition references their individual field definitions, so types and constraints are declared once.

Optional properties are omitted rather than set to `null`. Numbers remain in canonical cm, kg, kg/week, minutes and kcal/day; `unitSystem` changes display only. Name validation expects a trimmed save payload, matching the server's normalization. Explicit selected mode requires `calorieTarget`; explicit estimated mode requires age, sex, height and weight. Omitting the mode preserves the existing legacy fallback.

Additional definitions cover `appearance`, `appleHealthPreferences`, read-only `calculatedValues`, and read-only `healthDiagnostics`. Validate a combined presentation/interchange object through `urn:pulsecoach:settings#/definitions/settingsBundle`. The bundle is not an API save payload and does not combine existing storage locations.

BMI, maintenance calories, PulseCoach's estimate and the active calorie target are derived values. They are rejected by the root profile schema and available only in the calculated-values definition. `readOnly` is an annotation; formulas and authenticated ownership still require application/server enforcement. No owner ID, token or raw HealthKit sample is accepted by these schemas.

Boolean defaults in Health preferences are descriptive annotations, not instructions to overwrite saved preferences. This schema applies to new validated saves; permissive legacy imports continue using the separate runtime migration schema.
