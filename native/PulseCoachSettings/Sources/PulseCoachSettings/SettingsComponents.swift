import SwiftUI

public enum SettingsTheme {
    public static let mint = Color(red: 0.72, green: 0.95, blue: 0.42)
    public static let card = Color(red: 0.20, green: 0.45, blue: 0.61).opacity(0.24)
}

struct SettingsCard<Content: View>: View {
    let title: String
    let content: Content
    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title; self.content = content()
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title).font(.headline).accessibilityAddTraits(.isHeader)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(SettingsTheme.card, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.cyan.opacity(0.25)))
    }
}

struct SettingsField: View {
    let label: String
    @Binding var value: String
    var error: String? = nil
    var numeric = false
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.subheadline.weight(.medium))
            TextField(label, text: $value, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .keyboardType(numeric ? .decimalPad : .default)
                .accessibilityLabel(label)
                .accessibilityHint(error ?? "")
            if let error { Text(error).font(.caption).foregroundStyle(.red) }
        }
    }
}

struct ChoicePicker<Choice: SettingsChoice>: View {
    let title: String
    @Binding var selection: Choice
    var body: some View {
        Picker(title, selection: $selection) {
            ForEach(Array(Choice.allCases), id: \.self) { Text($0.rawValue).tag($0) }
        }.pickerStyle(.menu)
    }
}

struct OptionalChoicePicker<Choice: SettingsChoice>: View {
    let title: String
    @Binding var selection: Choice?
    var body: some View {
        Picker(title, selection: $selection) {
            Text("Not set").tag(Optional<Choice>.none)
            ForEach(Array(Choice.allCases), id: \.self) { Text($0.rawValue).tag(Optional.some($0)) }
        }.pickerStyle(.menu)
    }
}

struct DetailRow: View {
    let label: String
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.subheadline).foregroundStyle(.secondary)
            Text(value).font(.body.weight(.semibold)).textSelection(.enabled)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}
