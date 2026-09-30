export const SETTINGS_SECTIONS = [
  { id: "profile-health", title: "Profile & Health", description: "Profile, Personal Details and advanced health information." },
  { id: "goals", title: "Goals", description: "Daily, weekly and long-term targets." },
  { id: "units", title: "Units & Measurements", description: "Choose display units without changing stored measurements." },
  { id: "workout", title: "Workout Settings", description: "Workout behaviour, live metrics and equipment." },
  { id: "wellness", title: "Wellness", description: "Sleep, nutrition and mindfulness preferences." },
  { id: "coaching-ai", title: "Coaching & AI", description: "Adaptive plans, personalisation and serious safety guidance." },
  { id: "social-community", title: "Social & Community", description: "Friends, groups, challenges and private sharing." },
  { id: "notifications", title: "Notifications", description: "Workout, health, meals and motivation reminders." },
  { id: "privacy-permissions", title: "Privacy & Permissions", description: "Operating-system permissions, connections, data controls and visibility." },
  { id: "app-settings", title: "App Settings", description: "Account, display, accessibility, offline data and diagnostics." },
  { id: "about", title: "About", description: "Version, terms, privacy, support and acknowledgements." },
] as const;
export type SettingsSectionId = typeof SETTINGS_SECTIONS[number]["id"];
export function settingsSection(id: string) { return SETTINGS_SECTIONS.find((section) => section.id === id); }
