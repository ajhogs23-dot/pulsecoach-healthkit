import SwiftUI

/// Implement using the existing authenticated API. Never accept an owner ID from form data.
/// load() must hydrate defaults/legacy values through the server before decoding.
@MainActor public protocol PersonalDetailsRepository {
    var authenticatedUserID: String? { get }
    func load() async throws -> PersonalDetails
    func save(_ details: PersonalDetails) async throws -> PersonalDetails
}

@MainActor public final class PersonalDetailsStore: ObservableObject {
    @Published public var draft = PersonalDetails()
    @Published public private(set) var saved: PersonalDetails?
    @Published public private(set) var isLoading = false
    @Published public private(set) var isSaving = false
    @Published public private(set) var errors: [String: String] = [:]
    @Published public private(set) var message: String?
    @Published private var numericEdits: [NumericField: String] = [:]
    private let repository: any PersonalDetailsRepository
    private let ownerID: String?

    public init(repository: any PersonalDetailsRepository) {
        self.repository = repository
        self.ownerID = repository.authenticatedUserID
    }

    public var isAuthenticated: Bool { ownerID != nil && repository.authenticatedUserID == ownerID }
    public var isDirty: Bool { saved != nil && (draft != saved || !numericEdits.isEmpty) }
    public var imperial: Bool { draft.unitSystem == .imperial }
    public var preview: PersonalDetails {
        var value = draft
        for (field, text) in numericEdits {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            let normalized = trimmed.replacingOccurrences(of: Locale.current.decimalSeparator ?? ".", with: ".")
            value[keyPath: field.keyPath] = trimmed.isEmpty ? nil : (Double(normalized).map { $0 / field.displayFactor(imperial: imperial) } ?? .nan)
        }
        return value
    }

    public func load() async {
        guard validateSession(), !isDirty, !isLoading, !isSaving else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let value = try await repository.load()
            guard validateSession(), !Task.isCancelled else { return }
            draft = value; saved = value; numericEdits = [:]; errors = [:]; message = nil
        } catch { message = "Could not load your details. Check your connection and retry." }
    }

    public func save() async {
        guard validateSession(), !isSaving, saved != nil else { return }
        var value = preview
        value.name = value.name.trimmingCharacters(in: .whitespacesAndNewlines)
        errors = value.validationErrors
        guard errors.isEmpty else { message = "Review the highlighted fields before saving."; return }
        isSaving = true
        defer { isSaving = false }
        do {
            let result = try await repository.save(value)
            guard validateSession(), !Task.isCancelled else { return }
            draft = result; saved = result; numericEdits = [:]; errors = [:]
            message = "Personal Details saved."
        } catch { message = "Could not save. Your changes are still here. Please retry." }
    }

    @discardableResult public func validateSession() -> Bool {
        guard isAuthenticated else {
            draft = PersonalDetails(); saved = nil; numericEdits = [:]; errors = [:]
            message = "Sign in to access your Personal Details."
            return false
        }
        return true
    }

    public func discard() {
        if let saved { draft = saved }
        numericEdits = [:]; errors = [:]; message = nil
    }

    public func number(_ field: NumericField) -> Binding<String> {
        Binding(get: {
            if let edit = self.numericEdits[field] { return edit }
            guard let value = self.draft[keyPath: field.keyPath] else { return "" }
            return (value * field.displayFactor(imperial: self.imperial)).formatted(.number.precision(.fractionLength(0...2)).grouping(.never))
        }, set: { self.numericEdits[field] = $0; self.message = nil; self.errors = [:] })
    }

    public func text(_ keyPath: WritableKeyPath<PersonalDetails, String?>) -> Binding<String> {
        Binding(get: { self.draft[keyPath: keyPath] ?? "" }, set: {
            self.draft[keyPath: keyPath] = $0
            if keyPath == \.homeGym { self.draft.homeGymId = nil }
            if keyPath == \.currentGym { self.draft.currentGymId = nil }
            self.message = nil
        })
    }

    public var units: Binding<UnitSystem> {
        Binding(get: { self.draft.unitSystem ?? .metric }, set: { unit in
            // Commit valid numeric edits using the OLD units before switching display.
            let value = self.preview
            let invalid = self.numericEdits.keys.filter { value[keyPath: $0.keyPath]?.isFinite == false }
            guard invalid.isEmpty else {
                for field in invalid { self.errors[field.rawValue] = "Correct this number before switching units." }
                return
            }
            self.draft = value; self.numericEdits = [:]; self.draft.unitSystem = unit
        })
    }
}
