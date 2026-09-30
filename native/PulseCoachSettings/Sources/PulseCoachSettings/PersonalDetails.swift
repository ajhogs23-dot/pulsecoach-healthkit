import Foundation

public protocol SettingsChoice: RawRepresentable, CaseIterable, Codable, Hashable, Sendable where RawValue == String {}

public enum FitnessGoal: String, SettingsChoice {
    case loseFat = "Lose fat"
    case buildStrength = "Build strength"
    case improveFitness = "Improve fitness"
    case maintainHealth = "Maintain health"
}

public enum ActivityLevel: String, SettingsChoice {
    case sedentary = "Sedentary"
    case light = "Lightly active"
    case moderate = "Moderately active"
    case veryActive = "Very active"
}

public enum EstimateSex: String, SettingsChoice {
    case male = "Male"
    case female = "Female"
}

public enum UnitSystem: String, SettingsChoice {
    case metric = "metric"
    case imperial = "imperial"
}

public enum WeightGoal: String, SettingsChoice {
    case loss = "Weight loss"
    case maintenance = "Maintenance"
    case gain = "Muscle gain"
}

public enum DietaryPreference: String, SettingsChoice {
    case none = "No preference"
    case vegetarian = "Vegetarian"
    case highProtein = "High-protein"
}

public enum TrainingEquipment: String, SettingsChoice {
    case dumbbells = "Dumbbells"
    case gym = "Full gym"
    case bodyweight = "Bodyweight"
}

public enum CoachingStyle: String, SettingsChoice {
    case encouraging = "Encouraging"
    case direct = "Direct"
    case minimal = "Minimal"
}

public enum CalorieTargetMode: String, SettingsChoice {
    case selected = "selected"
    case estimated = "estimated"
}

/// Uses the existing TypeScript profile's JSON keys and canonical cm/kg/kcal units.
/// Derived values are not encoded. The server remains the source of truth.
public struct PersonalDetails: Codable, Equatable, Sendable {
    public var name = ""
    public var age: Double?
    public var sexForEstimate: EstimateSex?
    public var unitSystem: UnitSystem?
    public var heightCm: Double?
    public var weightKg: Double?
    public var targetWeightKg: Double?
    public var goal: FitnessGoal = .buildStrength
    public var weightGoal: WeightGoal?
    public var progressRate: Double?
    public var activityLevel: ActivityLevel = .moderate
    public var lifestyleActivity: String?
    public var exerciseFrequency: Double?
    public var foodPreference: DietaryPreference = .none
    public var allergies: String?
    public var nutritionApproach: String?
    public var trainingDays: String?
    public var workoutDuration: Double?
    public var trainingSetup: TrainingEquipment = .gym
    public var limitations: String?
    public var homeGym: String?
    public var currentGym: String?
    public var homeGymId: String?
    public var currentGymId: String?
    public var coachingStyle: CoachingStyle = .encouraging
    public var personality: String?
    public var notifications: String?
    public var encouragement: String?
    public var calorieTarget: Double?
    public var calorieTargetMode: CalorieTargetMode?

    public init() {}

    public var bmi: Double? {
        guard let heightCm, let weightKg,
              (100...250).contains(heightCm), (30...400).contains(weightKg) else { return nil }
        return (weightKg / pow(heightCm / 100, 2) * 10).rounded() / 10
    }

    public var calorieEstimate: CalorieEstimate? {
        guard let age, let heightCm, let weightKg, let sexForEstimate,
              (18...120).contains(age), (100...250).contains(heightCm),
              (30...400).contains(weightKg) else { return nil }
        let resting = 10 * weightKg + 6.25 * heightCm - 5 * age + (sexForEstimate == .male ? 5 : -161)
        let factors: [ActivityLevel: Double] = [.sedentary: 1.2, .light: 1.375, .moderate: 1.55, .veryActive: 1.725]
        let maintenance = resting * (factors[activityLevel] ?? 1.55)
        guard resting > 0, maintenance.isFinite else { return nil }
        let direction = weightGoal ?? (goal == .loseFat ? .loss : goal == .buildStrength ? .gain : .maintenance)
        let defaultRate = weightGoal != nil
            ? (direction == .loss ? 0.15 : direction == .gain ? 0.1 : 0)
            : (goal == .loseFat ? 0.15 : goal == .buildStrength ? 0.1 : 0)
        let adjustment = progressRate.map { $0 * 7700 / 7 } ?? maintenance * defaultRate
        guard adjustment.isFinite else { return nil }
        let adjusted = maintenance + (direction == .loss ? -adjustment : direction == .gain ? adjustment : 0)
        let recommended = direction == .loss ? max(resting, adjusted) : adjusted
        return CalorieEstimate(restingCalories: Int(resting.rounded()), maintenanceCalories: Int(maintenance.rounded()), recommendedCalories: Int(min(6000, max(1200, (recommended / 10).rounded() * 10))))
    }

    public var effectiveCalorieMode: CalorieTargetMode {
        calorieTargetMode ?? (calorieTarget == nil ? .estimated : .selected)
    }

    public var activeCalorieTarget: Double? {
        if calorieTargetMode == .estimated { return calorieEstimate.map { Double($0.recommendedCalories) } }
        return calorieTarget ?? calorieEstimate.map { Double($0.recommendedCalories) }
    }

    public var validationErrors: [String: String] {
        var errors: [String: String] = [:]
        if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || name.count > 120 {
            errors["name"] = "Enter a name of 1 to 120 characters."
        }
        for field in NumericField.allCases {
            if let value = self[keyPath: field.keyPath],
               !value.isFinite || !field.range.contains(value) || (field.wholeNumber && value.rounded() != value) {
                errors[field.rawValue] = field.validationMessage
            }
        }
        for (key, value) in ["lifestyleActivity": lifestyleActivity, "allergies": allergies,
                             "nutritionApproach": nutritionApproach, "trainingDays": trainingDays,
                             "limitations": limitations, "homeGym": homeGym, "currentGym": currentGym,
                             "personality": personality, "notifications": notifications, "encouragement": encouragement] {
            if let value, value.count > 1000 { errors[key] = "Use no more than 1,000 characters." }
        }
        if calorieTargetMode == .selected && calorieTarget == nil { errors["calorieTarget"] = "Enter your selected daily target." }
        if calorieTargetMode == .estimated && calorieEstimate == nil { errors["calorieTargetMode"] = "Complete valid age, sex, height and weight to use the estimate." }
        return errors
    }
}

public struct CalorieEstimate: Equatable, Sendable {
    public let restingCalories: Int
    public let maintenanceCalories: Int
    public let recommendedCalories: Int
}

public enum NumericField: String, CaseIterable {
    case age, heightCm, weightKg, targetWeightKg, progressRate, exerciseFrequency, workoutDuration, calorieTarget

    var keyPath: WritableKeyPath<PersonalDetails, Double?> {
        switch self {
        case .age: return \.age
        case .heightCm: return \.heightCm
        case .weightKg: return \.weightKg
        case .targetWeightKg: return \.targetWeightKg
        case .progressRate: return \.progressRate
        case .exerciseFrequency: return \.exerciseFrequency
        case .workoutDuration: return \.workoutDuration
        case .calorieTarget: return \.calorieTarget
        }
    }
    var range: ClosedRange<Double> {
        switch self {
        case .age: return 18...120
        case .heightCm: return 100...250
        case .weightKg, .targetWeightKg: return 30...400
        case .progressRate: return 0...1
        case .exerciseFrequency: return 0...7
        case .workoutDuration: return 5...180
        case .calorieTarget: return 1200...6000
        }
    }
    var wholeNumber: Bool { [.age, .exerciseFrequency, .workoutDuration, .calorieTarget].contains(self) }
    var validationMessage: String {
        switch self {
        case .age: return "Enter a whole age from 18 to 120."
        case .heightCm: return "Enter a height from 100 to 250 cm (39.37 to 98.43 in)."
        case .weightKg, .targetWeightKg: return "Enter a weight from 30 to 400 kg (66.14 to 881.85 lb)."
        case .progressRate: return "Enter a rate from 0 to 1 kg/week (0 to 2.20 lb/week)."
        case .exerciseFrequency: return "Enter 0 to 7 whole days."
        case .workoutDuration: return "Enter 5 to 180 whole minutes."
        case .calorieTarget: return "Enter 1,200 to 6,000 whole kcal."
        }
    }
    func displayFactor(imperial: Bool) -> Double {
        guard imperial else { return 1 }
        switch self {
        case .heightCm: return 1 / 2.54
        case .weightKg, .targetWeightKg, .progressRate: return 2.2046226218
        default: return 1
        }
    }
}
