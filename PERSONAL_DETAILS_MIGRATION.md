# Personal Details rollout

Apply `drizzle/0002_personal_details.sql` once to the existing MySQL database before deploying this server and app. It adds a nullable text column to `profiles` and does not update or delete existing rows. This workspace has no configured database connection; the migration has not been applied here.

The authenticated profile API is the source of truth. Personal Details requires a signed-in account and a server connection to load/save. No personal details are exposed by public or friend endpoints. Nutrition, home, wellness, training and coaching use the shared profile.

On first load, only the matching authenticated user's `pulsecoach.profile.<openId>` legacy record is imported. Existing server name, units and goals win over conflicting imported fields. Out-of-range legacy measurements remain available for correction. Unknown legacy fields remain stored and are preserved on subsequent saves. The source legacy record is not deleted. Imports are insert-if-empty, including concurrent imports.

The previous Profile screen used an unowned `local-user` key. That record cannot safely be assigned to an authenticated account automatically. It is left untouched and is never shown or imported into another account. Account-owned gym selections migrate with the profile. Existing account goals and unit preferences seed the new details without writing over their original records.

Optional measurements can be cleared. Metric cm/kg are stored regardless of display units. User-selected calorie targets remain stored when the estimate becomes active. Calorie estimates use the existing resting-energy/activity calculation, with a simple goal/rate adjustment; they are starting estimates rather than predictions of weight change.

Validation: name required; age 18-120 years; height 100-250 cm; weight/target weight 30-400 kg; selected target 1,200-6,000 kcal; rate 0-1 kg/week; exercise frequency 0-7 days; workout duration 5-180 minutes.

Automated verification includes rendered screen interactions, authenticated API ownership, legacy storage handling, calculations, unit conversion, and workout/coaching consumers. Device rendering and a live MySQL migration still require release-environment verification.
