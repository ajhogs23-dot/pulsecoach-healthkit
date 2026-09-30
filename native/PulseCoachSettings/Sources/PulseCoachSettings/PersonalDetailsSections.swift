import SwiftUI

@MainActor public struct BasicInformationView: View {
    @ObservedObject var store: PersonalDetailsStore
    public init(store: PersonalDetailsStore) { self.store = store }
    public var body: some View {
        SettingsCard("Basic information") {
            SettingsField(label: "Name", value: $store.draft.name, error: store.errors["name"])
            SettingsField(label: "Age (18-120 years)", value: store.number(.age), error: store.errors["age"], numeric: true)
            OptionalChoicePicker(title: "Sex used for calorie calculations", selection: $store.draft.sexForEstimate)
        }
    }
}

@MainActor public struct BodyDetailsView: View {
    @ObservedObject var store: PersonalDetailsStore
    public init(store: PersonalDetailsStore) { self.store = store }
    public var body: some View {
        SettingsCard("Body details") {
            ChoicePicker(title: "Units", selection: store.units)
            SettingsField(label: store.imperial ? "Height (inches)" : "Height (cm)", value: store.number(.heightCm), error: store.errors["heightCm"], numeric: true)
            SettingsField(label: store.imperial ? "Current weight (lb)" : "Current weight (kg)", value: store.number(.weightKg), error: store.errors["weightKg"], numeric: true)
            DetailRow(label: "BMI (calculated automatically)", value: store.preview.bmi.map { $0.formatted(.number.precision(.fractionLength(1))) } ?? "Add height and weight")
            SettingsField(label: store.imperial ? "Target weight (lb, optional)" : "Target weight (kg, optional)", value: store.number(.targetWeightKg), error: store.errors["targetWeightKg"], numeric: true)
        }
    }
}

@MainActor public struct GoalsView: View {
    @ObservedObject var store: PersonalDetailsStore
    public init(store: PersonalDetailsStore) { self.store = store }
    public var body: some View {
        SettingsCard("Goals") {
            ChoicePicker(title: "Main goal", selection: $store.draft.goal)
            OptionalChoicePicker(title: "Weight target", selection: $store.draft.weightGoal)
            SettingsField(label: store.imperial ? "Desired progress rate (lb/week)" : "Desired progress rate (kg/week)", value: store.number(.progressRate), error: store.errors["progressRate"], numeric: true)
        }
    }
}

@MainActor public struct ActivityProfileView: View {
    @ObservedObject var store: PersonalDetailsStore
    public init(store: PersonalDetailsStore) { self.store = store }
    public var body: some View {
        SettingsCard("Activity profile") {
            ChoicePicker(title: "Daily activity level", selection: $store.draft.activityLevel)
            SettingsField(label: "Work / lifestyle activity", value: store.text(\.lifestyleActivity), error: store.errors["lifestyleActivity"])
            SettingsField(label: "Typical exercise days per week (0-7)", value: store.number(.exerciseFrequency), error: store.errors["exerciseFrequency"], numeric: true)
        }
    }
}

@MainActor public struct FoodPreferencesView: View {
    @ObservedObject var store: PersonalDetailsStore
    public init(store: PersonalDetailsStore) { self.store = store }
    public var body: some View {
        SettingsCard("Food preferences") {
            ChoicePicker(title: "Dietary preferences", selection: $store.draft.foodPreference)
            SettingsField(label: "Allergies or exclusions", value: store.text(\.allergies), error: store.errors["allergies"])
            SettingsField(label: "Nutrition approach", value: store.text(\.nutritionApproach), error: store.errors["nutritionApproach"])
        }
    }
}

@MainActor public struct TrainingPreferencesView: View {
    @ObservedObject var store: PersonalDetailsStore
    public init(store: PersonalDetailsStore) { self.store = store }
    public var body: some View {
        SettingsCard("Training preferences") {
            SettingsField(label: "Training days (e.g. Mon, Wed, Fri)", value: store.text(\.trainingDays), error: store.errors["trainingDays"])
            SettingsField(label: "Preferred workout duration (minutes)", value: store.number(.workoutDuration), error: store.errors["workoutDuration"], numeric: true)
            ChoicePicker(title: "Available equipment", selection: $store.draft.trainingSetup)
            SettingsField(label: "Injuries, pain or movement limitations", value: store.text(\.limitations), error: store.errors["limitations"])
            SettingsField(label: "Home gym", value: store.text(\.homeGym), error: store.errors["homeGym"])
            SettingsField(label: "Current gym", value: store.text(\.currentGym), error: store.errors["currentGym"])
        }
    }
}

@MainActor public struct CoachingPreferencesView: View {
    @ObservedObject var store: PersonalDetailsStore
    public init(store: PersonalDetailsStore) { self.store = store }
    public var body: some View {
        SettingsCard("Coaching preferences") {
            ChoicePicker(title: "Coaching style", selection: $store.draft.coachingStyle)
            SettingsField(label: "Humour / personality level", value: store.text(\.personality), error: store.errors["personality"])
            SettingsField(label: "Notification preferences", value: store.text(\.notifications), error: store.errors["notifications"])
            SettingsField(label: "Encouragement preferences", value: store.text(\.encouragement), error: store.errors["encouragement"])
        }
    }
}

@MainActor public struct CalorieTargetsView: View {
    @ObservedObject var store: PersonalDetailsStore
    public init(store: PersonalDetailsStore) { self.store = store }
    public var body: some View {
        SettingsCard("Calorie targets") {
            SettingsField(label: "Your selected daily target (1,200-6,000 kcal)", value: store.number(.calorieTarget), error: store.errors["calorieTarget"], numeric: true)
            DetailRow(label: "PulseCoach estimated daily target", value: store.preview.calorieEstimate.map { "\($0.recommendedCalories) kcal/day" } ?? "Complete age, sex, height and weight")
            DetailRow(label: "Estimated maintenance calories", value: store.preview.calorieEstimate.map { "\($0.maintenanceCalories) kcal/day" } ?? "Not available")
            Text("Your selected target is a number you choose. PulseCoach calculates an estimate from your body details, activity, goal and progress rate. Using the estimate keeps your selected number available for later.")
                .font(.subheadline).foregroundStyle(.secondary)
            Button { store.draft.calorieTargetMode = .selected } label: {
                Label("Use my selected target", systemImage: store.draft.effectiveCalorieMode == .selected ? "checkmark.circle.fill" : "circle")
            }.accessibilityAddTraits(store.draft.effectiveCalorieMode == .selected ? .isSelected : [])
            Button { store.draft.calorieTargetMode = .estimated } label: {
                Label("Use PulseCoach estimate", systemImage: store.draft.effectiveCalorieMode == .estimated ? "checkmark.circle.fill" : "circle")
            }.disabled(store.preview.calorieEstimate == nil)
                .accessibilityAddTraits(store.draft.effectiveCalorieMode == .estimated ? .isSelected : [])
            DetailRow(label: "Active daily target", value: store.preview.activeCalorieTarget.map { "\($0.formatted(.number.precision(.fractionLength(0)))) kcal/day" } ?? "Not set")
            if let error = store.errors["calorieTargetMode"] { Text(error).foregroundStyle(.red) }
            Text("A starting estimate, adjusted as your details change. Actual needs vary; review it with your progress, energy and professional advice.").font(.caption).foregroundStyle(.secondary)
        }
    }
}
