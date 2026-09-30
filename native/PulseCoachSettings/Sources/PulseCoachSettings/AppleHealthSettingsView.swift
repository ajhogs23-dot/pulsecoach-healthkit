import SwiftUI
import Charts
import UIKit

@MainActor public struct AppleHealthSettingsView: View {
    @ObservedObject var store: HealthSettingsStore
    @Environment(\.openURL) private var openURL
    @State private var confirmDisconnect = false
    @State private var confirmDelete = false
    public init(store: HealthSettingsStore) { self.store = store }
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Manage categories, permissions and sync. Apple may not disclose whether read access was denied.")
                    .foregroundStyle(.secondary)
                SettingsCard("Health categories") {
                    ForEach($store.snapshot.categories) { $category in
                        Toggle(category.name, isOn: $category.enabled)
                    }
                    Button("Request selected categories") { Task { await store.requestAccess() } }
                }
                SettingsCard("Connection") {
                    DetailRow(label: "Status", value: store.snapshot.status)
                    DetailRow(label: "Last synced", value: dateLabel(store.snapshot.lastSyncedAt))
                    Button("Sync now") { Task { await store.sync() } }
                    Button("iPhone settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    }
                }
                SettingsCard("Today's steps") {
                    Text(store.snapshot.todaySteps.map { $0.formatted() } ?? "No data").font(.largeTitle.bold())
                }
                NavigationLink("Open sync diagnostics") { HealthDiagnosticsView(store: store) }
                SettingsCard("Steps - last 30 days") {
                    if store.snapshot.stepHistory.isEmpty {
                        Text("History appears after a successful sync.").foregroundStyle(.secondary)
                    } else {
                        Chart(store.snapshot.stepHistory.suffix(30)) { day in
                            BarMark(x: .value("Date", day.date, unit: .day), y: .value("Steps", day.count))
                                .foregroundStyle(SettingsTheme.mint)
                        }.frame(height: 160)
                        .accessibilityLabel("Daily steps for the last 30 days")
                    }
                }
                SettingsCard("Privacy and revocation") {
                    Text("Health snapshots belong to your signed-in account. Disconnecting the integration does not revoke Apple permissions. Manage those in iPhone Settings > Health > Data Access & Devices.")
                    Button("Disconnect integration", role: .destructive) { confirmDisconnect = true }
                    Button("Delete cached data", role: .destructive) { confirmDelete = true }
                }
            }.disabled(store.busy || !store.isAuthenticated).padding(20)
            if store.busy { ProgressView("Updating Apple Health") }
            if let error = store.error { Text(error).foregroundStyle(.red).padding() }
        }
        .navigationTitle("Apple Health")
        .navigationBarTitleDisplayMode(.inline)
        .task { await store.load() }
        .confirmationDialog("Disconnect Apple Health?", isPresented: $confirmDisconnect, titleVisibility: .visible) {
            Button("Disconnect", role: .destructive) { Task { await store.disconnect() } }
        }
        .confirmationDialog("Delete imported health data from this account's cache?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete cached data", role: .destructive) { Task { await store.deleteCachedData() } }
        }
    }
}

@MainActor public struct HealthDiagnosticsView: View {
    @ObservedObject var store: HealthSettingsStore
    public init(store: HealthSettingsStore) { self.store = store }
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Timing, counts and sanitized errors only. Raw health records and tokens must never appear in diagnostics.")
                    .foregroundStyle(.secondary)
                SettingsCard("Connection") {
                    DetailRow(label: "Status", value: store.snapshot.status)
                    DetailRow(label: "Last attempted", value: dateLabel(store.snapshot.diagnostics.lastAttemptedAt))
                    DetailRow(label: "Last successful", value: dateLabel(store.snapshot.diagnostics.lastSyncedAt))
                    DetailRow(label: "Records received", value: store.snapshot.diagnostics.recordsReceived.formatted())
                    DetailRow(label: "Cache written", value: dateLabel(store.snapshot.diagnostics.cacheWrittenAt))
                    DetailRow(label: "Latest error", value: store.snapshot.diagnostics.lastError ?? "None recorded")
                }
                SettingsCard("Enabled categories") {
                    ForEach(store.snapshot.categories.filter(\.enabled)) { category in
                        Label(category.name, systemImage: "checkmark.circle")
                    }
                }
                SettingsCard("Apple controls permissions") {
                    Text("An enabled category records your preference. iOS controls which HealthKit data is available to the app.")
                }
            }.padding(20)
        }
        .navigationTitle("Health Diagnostics")
        .navigationBarTitleDisplayMode(.inline)
        .task { await store.load() }
    }
}

private func dateLabel(_ date: Date?) -> String {
    date?.formatted(date: .abbreviated, time: .shortened) ?? "Not available"
}
