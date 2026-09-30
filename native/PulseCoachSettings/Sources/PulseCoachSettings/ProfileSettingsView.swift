import SwiftUI

/// Entry point. Create fresh stores when the authenticated account changes.
@MainActor public struct ProfileSettingsView: View {
    @StateObject private var details: PersonalDetailsStore
    @StateObject private var health: HealthSettingsStore
    @AppStorage("pulsecoach.appearance") private var appearance = "system"
    @Environment(\.scenePhase) private var scenePhase

    public init(profileRepository: any PersonalDetailsRepository, healthRepository: any HealthSettingsRepository) {
        _details = StateObject(wrappedValue: PersonalDetailsStore(repository: profileRepository))
        _health = StateObject(wrappedValue: HealthSettingsStore(repository: healthRepository))
    }
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Make coaching fit you.").font(.largeTitle.bold())
                    SettingsCard("Appearance") {
                        Picker("Appearance", selection: $appearance) {
                            Text("System").tag("system")
                            Text("Light").tag("light")
                            Text("Dark").tag("dark")
                        }.pickerStyle(.segmented)
                    }
                    NavigationLink {
                        PersonalDetailsView(store: details)
                    } label: {
                        SettingsCard("Personal Details") {
                            Text(details.saved.map { "\($0.name) | \($0.goal.rawValue)" } ?? "Your body, goals and preferences")
                                .font(.subheadline).foregroundStyle(.secondary)
                            Label("Manage personal details", systemImage: "chevron.right")
                        }
                    }.buttonStyle(.plain)
                    NavigationLink {
                        AppleHealthSettingsView(store: health)
                    } label: {
                        SettingsCard("Apple Health") {
                            Label(health.snapshot.status, systemImage: "heart.text.square")
                            Text("Manage categories, permissions and sync.").font(.subheadline).foregroundStyle(.secondary)
                        }
                    }.buttonStyle(.plain)
                    if let message = details.message, details.saved == nil {
                        Text(message).foregroundStyle(.secondary)
                        Button("Retry loading profile") { Task { await details.load() } }
                    }
                }.padding(20)
            }
            .navigationTitle("Profile")
            .task { await details.load(); await health.load() }
        }
        .tint(SettingsTheme.mint)
        .preferredColorScheme(appearance == "system" ? nil : appearance == "dark" ? .dark : .light)
        .onChange(of: scenePhase) { phase in
            if phase == .active { details.validateSession(); health.validateSession() }
        }
    }
}

@MainActor public struct PersonalDetailsView: View {
    @ObservedObject var store: PersonalDetailsStore
    @Environment(\.dismiss) private var dismiss
    @State private var confirmDiscard = false
    public init(store: PersonalDetailsStore) { self.store = store }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if store.isLoading && store.saved == nil {
                    ProgressView("Loading Personal Details")
                } else if store.saved != nil && store.isAuthenticated {
                    Text("Private to your account. These details guide nutrition, workouts and coaching.")
                        .foregroundStyle(.secondary)
                    Group {
                        BasicInformationView(store: store)
                        BodyDetailsView(store: store)
                        GoalsView(store: store)
                        ActivityProfileView(store: store)
                        FoodPreferencesView(store: store)
                        TrainingPreferencesView(store: store)
                        CoachingPreferencesView(store: store)
                        CalorieTargetsView(store: store)
                    }.disabled(store.isSaving)
                    Text(store.isSaving ? "Saving..." : store.isDirty ? "Unsaved changes" : "No unsaved changes")
                        .font(.subheadline.weight(.semibold))
                    if let message = store.message { Text(message).foregroundStyle(store.errors.isEmpty ? Color.secondary : Color.red) }
                    Button { Task { await store.save() } } label: {
                        HStack {
                            Spacer()
                            if store.isSaving { ProgressView() }
                            Text(store.isSaving ? "Saving..." : "Save").bold()
                            Spacer()
                        }.padding(.vertical, 8)
                    }
                    .buttonStyle(.borderedProminent)
                    .foregroundStyle(.black)
                    .disabled(!store.isDirty || store.isSaving)
                    .accessibilityIdentifier("personal-details-save")
                } else {
                    Text(store.message ?? "Sign in to access your Personal Details.")
                    Button("Retry") { Task { await store.load() } }
                }
            }.padding(20)
        }
        .navigationTitle("Personal Details")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    if store.isDirty { confirmDiscard = true } else { dismiss() }
                } label: { Label("Back", systemImage: "chevron.left") }
                .disabled(store.isSaving)
            }
        }
        .interactiveDismissDisabled(store.isDirty || store.isSaving)
        .confirmationDialog("Discard unsaved changes?", isPresented: $confirmDiscard, titleVisibility: .visible) {
            Button("Discard changes", role: .destructive) { store.discard(); dismiss() }
            Button("Keep editing", role: .cancel) {}
        }
        .task { await store.load() }
    }
}
