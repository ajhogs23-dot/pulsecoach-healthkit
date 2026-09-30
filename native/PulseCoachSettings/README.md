# PulseCoach SwiftUI settings

An iOS 16+ Swift package generated from the existing Profile wireframe. This is a native view library, not a replacement for the Expo app, and no Xcode app target has been added.

The package-local [settings.schema.json](settings.schema.json) describes the flat `PersonalDetails` JSON exchanged by the SwiftUI repository adapter. It mirrors the canonical schema in `shared/settings.schema.json`; keep both schemas aligned when fields or validation rules change.

## Screen hierarchy

```text
ProfileSettingsView (NavigationStack)
  PersonalDetailsView
    BasicInformationView
    BodyDetailsView
    GoalsView
    ActivityProfileView
    FoodPreferencesView
    TrainingPreferencesView
    CoachingPreferencesView
    CalorieTargetsView
  AppleHealthSettingsView
    HealthDiagnosticsView
```

The eight categories stay together on Personal Details in the specified order. Profile shows only a short summary. Each category view is reusable. Apple Health stays separate.

## Integrate in an iOS app

Add this directory as a local Swift package in Xcode, link the `PulseCoachSettings` product, and import it:

```swift
import PulseCoachSettings

// Construct these adapters using your existing authenticated services.
ProfileSettingsView(
    profileRepository: authenticatedProfileAdapter,
    healthRepository: authenticatedHealthAdapter
)
.id(authenticatedUserID) // Recreate stores immediately on sign-in/out or account change.
```

Implement `PersonalDetailsRepository` and `HealthSettingsRepository` with the existing services. Their `authenticatedUserID` properties must reflect the live authenticated session. The stores check ownership before and after operations, clear data on a detected account change, and never accept owner IDs from fields. The host must remove/recreate this view immediately when authentication changes, including background sign-out. Do not use a guest fallback or a global preferences cache.

The profile adapter should call the current `profile.personalDetails` and `profile.savePersonalDetails` authenticated endpoints using the existing transport and session. Unwrap the load response's `details` field before decoding. Use the existing account-owned migration before first load where required. Load/save failures must throw, never return fabricated defaults or claim success. The native package intentionally does not invent a new REST endpoint or store a second copy of health details.

`PersonalDetails` uses the TypeScript JSON field names and enum raw values. Optional numbers encode as absent when cleared; submit the full profile on save. The existing server preserves unknown stored fields. Required fields are supplied by the server's profile defaults. BMI and calorie estimates are computed properties and are not encoded. Calculations mirror `shared/personal-details.ts`; keep formula changes in sync in both implementations. All stored measurements are metric; display supports metric and imperial. Edited numeric text is retained during validation failures.

The HealthKit adapter must use the current per-account cache, return enabled category preferences (sleep off by default for new accounts), sanitized diagnostics, and step history. It must implement real request, sync, disconnect and cache deletion operations. Do not equate a requested read category with granted read access. Cache deletion must affect only the signed-in account and must not delete records from Apple Health. The UI confirms destructive actions.

Appearance is the only local `AppStorage` value; it contains no personal or health data. Notification and encouragement fields are coaching preferences, not an implementation of notification scheduling. Gym text edits clear stale directory IDs; an existing ID remains encoded until edited.

## Save and navigation behaviour

Personal Details has loading, retry, saving, saved, unsaved and field-error states. Saving disables edits and Back. Leaving through Back while dirty offers Discard or Keep editing. Native interactive back is disabled by the custom Back control; modal interactive dismissal is also blocked while dirty/saving. Saved data is reloaded from the injected repository when the screen is reopened. Unsaved edits are kept in memory only, not persisted across process termination.

## Verification

XCTest coverage is included for JSON compatibility, BMI/calorie parity, target switching, validation, unit conversion, save/reopen, failed saves and account isolation. Build the package and run its test scheme on an iOS Simulator in Xcode (or `xcodebuild` with an available simulator destination). A macOS `swift test` target is insufficient because these views import UIKit.

This package was generated on Windows without Swift, Xcode or an iOS Simulator, so its native build, XCTest execution and visual layout have not been verified. The host's authenticated and HealthKit adapters are integration work, not included implementations. Before release, verify Dynamic Type, VoiceOver, light/dark appearance, navigation gestures, real server persistence, permission flows, account switching and previews on an iOS device/simulator.
