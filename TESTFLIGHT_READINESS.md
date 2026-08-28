# PulseCoach TestFlight Readiness Audit

## Current status

PulseCoach is a validated Expo mobile prototype. The managed web preview is useful for UI review, but it is not evidence that iPhone-only capabilities work. A physical iPhone development build is required to verify HealthKit, camera/barcode capture, speech recognition, background location, notifications, and Apple Watch behavior.

## Feature classification

| Feature | Classification | Current evidence | TestFlight implication |
|---|---|---|---|
| Today, Coach, Nutrition, Supplements, Workout, Progress, Profile | Ready for UI testing | TypeScript, lint, automated tests, and preview review | Test layout and navigation on iPhone |
| Startup login, account creation, provider choices | Implemented but configuration-dependent | Branded screens and auth gate exist | Configure identity providers and test real callbacks |
| Owner admin and feedback screens | Implemented prototype; server foundation exists | Protected route and aggregate dashboard UI | Verify owner role and production persistence |
| Food/supplement search and barcode states | Implemented prototype; provider foundation exists | Open Food Facts barcode resolver and review states | Add native scanner, credentials/providers, and real products |
| Nutrition totals and meal sections | Implemented UI prototype | Portion helper tests and phone review | Replace demo catalogue/logs with persisted user data |
| Workout choice and regeneration | Ready for UI testing | Deterministic selection tests | Validate limitations and saved sessions on device |
| Machine recognition and product-photo recognition | Demonstration/placeholder | Capture and review states exist | Add native camera plus server-side vision and test accuracy |
| Voice coaching and rest feedback | Demonstration/native-dependent | Spoken feedback prototype exists | Add speech-to-text and locked-screen notification testing |
| Apple Health steps, energy, distance, and heart rate | Native/configuration required | Connection states only | Add HealthKit service and physical-device verification |
| Run, walk, cycle GPS and daily breadcrumb map | Native/configuration required | Map and privacy states only | Add Core Location, background modes, map rendering, and retention tests |
| Friends, sharing permissions, challenges | Prototype plus partial server foundation | Privacy UI and aggregate API foundation | Complete authenticated social APIs and cross-user tests |
| Apple Watch | Not implemented | No watch target or companion extension | Requires a separate native/watch implementation |
| Food/supplement full catalogue | Waiting on providers/data policy | Open Food Facts adapter only | Configure provider coverage, caching, attribution, and rate limits |
| Production database and storage | Foundation exists; production configuration required | Additive schema and helpers exist | Verify migrations, backups, retention, and deletion |

## Configuration checklist

The current app has a unique-looking development bundle identifier, but it must be confirmed as owned and unused in the Apple Developer account before production builds. EAS project linking, Apple team credentials, App Store Connect application records, and build numbers still require account-level configuration. Secrets must remain in secure configuration and server environments; they must not be bundled into the mobile client.

The current configuration includes camera and microphone permission text. HealthKit, speech recognition, location, motion, notifications, and background activity need final native permission descriptions and implementation-specific entitlements. Do not claim these features work until they pass physical-device tests.

## Required account actions

The project owner must sign in through the official Expo/EAS and Apple Developer/App Store Connect interfaces, create or select the iOS application, confirm the bundle identifier, accept Apple agreements, configure Sign in with Apple, and provide the required credentials through the secure configuration flow. Passwords, private keys, recovery codes, and verification codes must never be pasted into chat.

For a private beta, use an EAS store build distributed through TestFlight. Do not use App Store public release or App Store submission as the testing path. The owner must complete the final Apple/TestFlight submission steps in the official account interface.

## Physical-device test checklist

Test account creation and each configured login provider, food text search, barcode scanning, product and nutrition-label photos, portion editing, all four meal sections, supplement search and scanning, workout selection, machine recognition, exercise instructions, voice commands, rest timers, HealthKit metrics, GPS sessions, daily route privacy, friend-specific sharing, challenges, and any available Apple Watch controls. Record device model, iOS version, permission choices, network state, and whether the feature used real data or an honest unavailable state.

Send bugs through the Profile feedback form with a category, reproduction steps, expected result, actual result, device/iOS version, and optional screenshot. Screenshots can be attached in chat with a short description and the screen where the issue occurred.
