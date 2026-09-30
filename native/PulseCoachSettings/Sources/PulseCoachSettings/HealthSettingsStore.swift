import SwiftUI

public struct HealthCategorySetting: Identifiable, Equatable, Sendable {
    public let id: String
    public let name: String
    public var enabled: Bool
    public init(id: String, name: String, enabled: Bool) {
        self.id = id; self.name = name; self.enabled = enabled
    }
}

public struct HealthDiagnostics: Equatable, Sendable {
    public var lastAttemptedAt: Date?
    public var lastSyncedAt: Date?
    public var cacheWrittenAt: Date?
    public var recordsReceived: Int = 0
    /// Adapter must supply a sanitized message, never raw records or credentials.
    public var lastError: String?
    public init() {}
}

public struct DailyStepCount: Identifiable, Equatable, Sendable {
    public var id: Date { date }
    public let date: Date
    public let count: Int
    public init(date: Date, count: Int) { self.date = date; self.count = count }
}

public struct HealthSettingsSnapshot: Equatable, Sendable {
    public var status: String = "Not connected"
    public var categories: [HealthCategorySetting] = []
    public var lastSyncedAt: Date?
    public var todaySteps: Int?
    public var stepHistory: [DailyStepCount] = []
    public var diagnostics = HealthDiagnostics()
    public init() {}
}

/// Bridge this to the existing per-account HealthKit service. Enabling a category
/// requests access; it must never be represented as proof that iOS granted read access.
@MainActor public protocol HealthSettingsRepository {
    var authenticatedUserID: String? { get }
    func load() async throws -> HealthSettingsSnapshot
    func requestAccess(categories: [HealthCategorySetting]) async throws -> HealthSettingsSnapshot
    func sync() async throws -> HealthSettingsSnapshot
    func disconnect() async throws -> HealthSettingsSnapshot
    func deleteCachedData() async throws -> HealthSettingsSnapshot
}

@MainActor public final class HealthSettingsStore: ObservableObject {
    @Published public var snapshot = HealthSettingsSnapshot()
    @Published public private(set) var busy = false
    @Published public private(set) var error: String?
    private let repository: any HealthSettingsRepository
    private let ownerID: String?
    public init(repository: any HealthSettingsRepository) {
        self.repository = repository; self.ownerID = repository.authenticatedUserID
    }
    public var isAuthenticated: Bool { ownerID != nil && ownerID == repository.authenticatedUserID }
    @discardableResult public func validateSession() -> Bool {
        guard isAuthenticated else { snapshot = HealthSettingsSnapshot(); error = "Sign in to access Apple Health settings."; return false }
        return true
    }
    private func perform(_ action: () async throws -> HealthSettingsSnapshot) async {
        guard validateSession(), !busy else { return }
        busy = true; error = nil
        defer { busy = false }
        do {
            let next = try await action()
            guard validateSession(), !Task.isCancelled else { return }
            snapshot = next
        } catch { self.error = "The Health operation could not finish. Please retry." }
    }
    public func load() async { await perform { try await repository.load() } }
    public func requestAccess() async { await perform { try await repository.requestAccess(categories: snapshot.categories) } }
    public func sync() async { await perform { try await repository.sync() } }
    public func disconnect() async { await perform { try await repository.disconnect() } }
    public func deleteCachedData() async { await perform { try await repository.deleteCachedData() } }
}
