import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { router, useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { addFoodLog, loadFoodLog, removeFoodLog, summariseFoodLog, todayFoodLog, type FoodLogEntry, type FoodNutrition, type MealName } from "@/lib/food-log";
import { calculateCalorieEstimate, DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

type CatalogueItem = {
  name: string;
  brand: string;
  detail: string;
  source: string;
  nutrition: FoodNutrition;
};

const catalogue: CatalogueItem[] = [
  { name: "Greek yoghurt", brand: "Generic", detail: "170 g tub · 16 g protein", source: "Typical label values", nutrition: { calories: 150, protein: 16, carbohydrates: 12, sugars: 9, fat: 4, fibre: 0, sodium: 70 } },
  { name: "High protein milk", brand: "Woolworths", detail: "250 ml · 15 g protein", source: "Typical label values", nutrition: { calories: 160, protein: 15, carbohydrates: 14, sugars: 12, fat: 5, fibre: 0, sodium: 130 } },
  { name: "Salmon grain bowl", brand: "Saved meal", detail: "1 bowl · protein + fibre", source: "Editable estimate", nutrition: { calories: 520, protein: 35, carbohydrates: 55, sugars: 8, fat: 18, fibre: 8, sodium: 650 } },
  { name: "Banana", brand: "Common food", detail: "1 medium · 105 kcal", source: "Generic food", nutrition: { calories: 105, protein: 1.3, carbohydrates: 27, sugars: 14, fat: 0.4, fibre: 3.1, sodium: 1 } },
];

const mealNames: MealName[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

export default function NutritionScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [query, setQuery] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealName>("Breakfast");
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualServings, setManualServings] = useState("1");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualFeedback, setManualFeedback] = useState("");

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadFoodLog(userKey), loadProfilePreferences(userKey)]).then(([savedEntries, savedProfile]) => {
      if (!active) return;
      setEntries(savedEntries);
      setProfile(savedProfile);
    });
    return () => { active = false; };
  }, [userKey]));

  const suggestions = useMemo(
    () => query.trim()
      ? catalogue.filter((item) => `${item.name} ${item.brand}`.toLowerCase().includes(query.toLowerCase()))
      : catalogue.slice(0, 2),
    [query],
  );
  const todayEntries = todayFoodLog(entries);
  const totals = summariseFoodLog(entries);
  const kilojoules = totals.calories * 4.184;
  const calculatedTarget = calculateCalorieEstimate(profile)?.recommendedCalories;
  const effectiveTarget = profile.calorieTarget ?? calculatedTarget;
  const remainingCalories = effectiveTarget === undefined ? undefined : effectiveTarget - totals.calories;

  const addSuggestion = async (item: CatalogueItem) => {
    const updated = await addFoodLog(userKey, {
      name: item.name,
      meal: selectedMeal,
      servings: 1,
      nutrition: item.nutrition,
    });
    setEntries(updated);
    setQuery("");
  };

  const deleteEntry = async (entryId: string) => {
    setEntries(await removeFoodLog(userKey, entryId));
  };

  const saveManualFood = async () => {
    const servings = Number(manualServings);
    const calories = Number(manualCalories);
    const protein = Number(manualProtein || 0);
    const carbohydrates = Number(manualCarbs || 0);
    const fat = Number(manualFat || 0);
    if (!manualName.trim()) {
      setManualFeedback("Enter a food name.");
      return;
    }
    if (!Number.isFinite(servings) || servings <= 0 || !Number.isFinite(calories) || calories < 0 || [protein, carbohydrates, fat].some((value) => !Number.isFinite(value) || value < 0)) {
      setManualFeedback("Use zero or positive numbers and a serving amount greater than zero.");
      return;
    }
    const updated = await addFoodLog(userKey, {
      name: manualName.trim(),
      meal: selectedMeal,
      servings,
      nutrition: { calories, protein, carbohydrates, fat, sugars: 0, fibre: 0, sodium: 0 },
    });
    setEntries(updated);
    setManualName("");
    setManualServings("1");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setManualFeedback("Food saved.");
    setManualOpen(false);
  };

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>NUTRITION</Text>
      <Text style={styles.title}>Eat with clarity.</Text>
      <Text style={styles.subtitle}>Search first, choose the meal, then add the food you actually consumed.</Text>

      <View style={styles.mealTabs}>{mealNames.map((meal) => <Pressable key={meal} onPress={() => setSelectedMeal(meal)} style={[styles.mealTab, selectedMeal === meal && styles.mealTabActive]}><Text style={[styles.mealTabText, selectedMeal === meal && styles.mealTabTextActive]}>{meal}</Text></Pressable>)}</View>
      <View style={styles.search}><IconSymbol name="magnifyingglass" size={18} color={muted} /><TextInput value={query} onChangeText={setQuery} placeholder={`Search food for ${selectedMeal.toLowerCase()}`} placeholderTextColor="#718071" style={styles.searchInput} /></View>
      <View style={styles.entryRow}><Pressable style={styles.entry} onPress={() => router.push("/scan?mode=food" as any)}><IconSymbol name="barcode.viewfinder" size={18} color={mint} /><Text style={styles.entryText}>Scan barcode</Text></Pressable><Pressable style={styles.entry} onPress={() => router.push("/scan?mode=food" as any)}><IconSymbol name="camera.fill" size={18} color={mint} /><Text style={styles.entryText}>Take a photo</Text></Pressable></View>

      <Pressable style={styles.addMeal} onPress={() => { setManualOpen((open) => !open); setManualFeedback(""); }}><Text style={styles.addMealText}>{manualOpen ? "− Close manual entry" : "+ Add a custom food"}</Text></Pressable>
      {manualOpen ? <View style={styles.manualCard}>
        <Text style={styles.suggestionTitle}>Custom food · {selectedMeal}</Text>
        <TextInput value={manualName} onChangeText={setManualName} placeholder="Food name" placeholderTextColor="#718071" style={styles.manualInput} />
        <View style={styles.manualRow}>
          <TextInput value={manualServings} onChangeText={setManualServings} placeholder="Servings" placeholderTextColor="#718071" keyboardType="decimal-pad" style={styles.manualInputHalf} />
          <TextInput value={manualCalories} onChangeText={setManualCalories} placeholder="kcal per serve" placeholderTextColor="#718071" keyboardType="decimal-pad" style={styles.manualInputHalf} />
        </View>
        <View style={styles.manualRow}>
          <TextInput value={manualProtein} onChangeText={setManualProtein} placeholder="Protein g" placeholderTextColor="#718071" keyboardType="decimal-pad" style={styles.manualInputThird} />
          <TextInput value={manualCarbs} onChangeText={setManualCarbs} placeholder="Carbs g" placeholderTextColor="#718071" keyboardType="decimal-pad" style={styles.manualInputThird} />
          <TextInput value={manualFat} onChangeText={setManualFat} placeholder="Fat g" placeholderTextColor="#718071" keyboardType="decimal-pad" style={styles.manualInputThird} />
        </View>
        {manualFeedback ? <Text style={styles.foodSource}>{manualFeedback}</Text> : null}
        <Pressable style={styles.recipe} onPress={() => void saveManualFood()}><Text style={styles.recipeText}>Save custom food</Text></Pressable>
      </View> : null}

      <View style={styles.suggestions}><Text style={styles.suggestionTitle}>{query.length ? "Suggested matches" : "Quick add"}</Text>{suggestions.length ? suggestions.map((item) => <Pressable key={item.name} style={styles.suggestion} onPress={() => void addSuggestion(item)}><View style={styles.foodIcon}><Text style={styles.foodMark}>{item.name[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.foodName}>{item.name}</Text><Text style={styles.foodMeta}>{item.brand} · {item.detail}</Text><Text style={styles.foodSource}>{item.source}</Text></View><Text style={styles.add}>Add</Text></Pressable>) : <Text style={styles.empty}>No confident match. Try another spelling.</Text>}</View>

      <View style={styles.summary}><View><Text style={styles.summaryEyebrow}>TODAY’S TOTALS</Text><Text style={styles.summaryTitle}>{Math.round(totals.calories)} kcal <Text style={styles.kj}>· {Math.round(kilojoules)} kJ</Text></Text><Text style={styles.summaryCopy}>{remainingCalories === undefined ? `${todayEntries.length} food entr${todayEntries.length === 1 ? "y" : "ies"} logged today` : `${Math.round(Math.abs(remainingCalories))} kcal ${remainingCalories >= 0 ? "remaining" : "over target"} · ${todayEntries.length} entries`}</Text></View><View style={styles.ring}><Text style={styles.ringText}>{Math.round(totals.protein)}g</Text><Text style={styles.ringLabel}>PROTEIN</Text></View></View>
      <View style={styles.metricRow}>{[["Carbs", `${Math.round(totals.carbohydrates)} g`], ["Fat", `${Math.round(totals.fat)} g`], ["Fibre", `${Math.round(totals.fibre)} g`], ["Sugar", `${Math.round(totals.sugars)} g`], ["Sodium", `${Math.round(totals.sodium)} mg`]].map(([label, value]) => <View key={label} style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>)}</View>

      {mealNames.map((meal) => {
        const mealEntries = todayEntries.filter((entry) => entry.meal === meal);
        const mealCalories = mealEntries.reduce((total, entry) => total + entry.nutrition.calories * entry.servings, 0);
        return <View key={meal} style={styles.meal}><View style={styles.mealTop}><Text style={styles.mealTitle}>{meal}</Text><Text style={styles.mealTotal}>{Math.round(mealCalories)} kcal</Text></View>{mealEntries.length ? mealEntries.map((entry) => <View key={entry.id} style={styles.logged}><View style={{ flex: 1 }}><Text style={styles.loggedName}>{entry.name} · {entry.servings} serve</Text><Text style={styles.foodSource}>{Math.round(entry.nutrition.protein * entry.servings)} g protein</Text></View><Pressable onPress={() => void deleteEntry(entry.id)}><Text style={styles.loggedAction}>Delete</Text></Pressable></View>) : <Text style={styles.emptyMeal}>Nothing logged yet.</Text>}<Pressable style={styles.addMeal} onPress={() => setSelectedMeal(meal)}><Text style={styles.addMealText}>+ Add food to {meal.toLowerCase()}</Text></Pressable></View>;
      })}

      <Pressable style={styles.recipe} onPress={() => router.push("/recipes" as any)}><IconSymbol name="fork.knife" size={18} color="#111513" /><Text style={styles.recipeText}>Build a meal from ingredients at home</Text></Pressable>
      <Text style={styles.note}>Values use label or generic estimates. Confirm serving sizes and edit estimates when product information differs.</Text>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({ manualCard: { backgroundColor: "#1B231D", borderRadius: 17, padding: 13, borderWidth: 1, borderColor: "#354536", gap: 10 }, manualRow: { flexDirection: "row", gap: 8 }, manualInput: { backgroundColor: "#111513", borderRadius: 12, borderWidth: 1, borderColor: "#3B4A3B", padding: 12, color: "#F4F7F0" }, manualInputHalf: { flex: 1, backgroundColor: "#111513", borderRadius: 12, borderWidth: 1, borderColor: "#3B4A3B", padding: 12, color: "#F4F7F0" }, manualInputThird: { flex: 1, backgroundColor: "#111513", borderRadius: 12, borderWidth: 1, borderColor: "#3B4A3B", padding: 10, color: "#F4F7F0", fontSize: 11 }, content: { paddingBottom: 36, gap: 13 }, eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800", letterSpacing: -0.7 }, subtitle: { color: muted, fontSize: 14, lineHeight: 20 }, search: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#111513", borderRadius: 14, borderWidth: 1, borderColor: "#3B4A3B", paddingHorizontal: 13 }, searchInput: { flex: 1, color: "#F4F7F0", paddingVertical: 14, fontSize: 14 }, entryRow: { flexDirection: "row", gap: 9 }, entry: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#2B3B27", borderRadius: 13, padding: 12 }, entryText: { color: mint, fontWeight: "800", fontSize: 12 }, suggestions: { backgroundColor: "#1B231D", borderRadius: 17, padding: 13, borderWidth: 1, borderColor: "#354536", gap: 9 }, suggestionTitle: { color: "#F4F7F0", fontWeight: "800", fontSize: 14 }, suggestion: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }, foodIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center" }, foodMark: { color: mint, fontWeight: "900" }, foodName: { color: "#F4F7F0", fontWeight: "800", fontSize: 13 }, foodMeta: { color: muted, fontSize: 10, marginTop: 3 }, foodSource: { color: mint, fontSize: 9, fontWeight: "700", marginTop: 3 }, add: { color: mint, fontSize: 11, fontWeight: "800" }, empty: { color: muted, fontSize: 12, lineHeight: 17 }, summary: { backgroundColor: "#202A21", borderRadius: 19, padding: 16, borderWidth: 1, borderColor: "#354536", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, summaryEyebrow: { color: mint, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, summaryTitle: { color: "#F4F7F0", fontSize: 22, fontWeight: "900", marginTop: 7 }, kj: { color: muted, fontSize: 12, fontWeight: "600" }, summaryCopy: { color: muted, fontSize: 10, marginTop: 5 }, ring: { width: 63, height: 63, borderRadius: 32, borderWidth: 3, borderColor: mint, justifyContent: "center", alignItems: "center" }, ringText: { color: "#F4F7F0", fontSize: 16, fontWeight: "900" }, ringLabel: { color: mint, fontSize: 8, fontWeight: "900" }, metricRow: { flexDirection: "row", gap: 7 }, metric: { flex: 1, backgroundColor: "#1B231D", borderRadius: 11, padding: 9 }, metricLabel: { color: muted, fontSize: 9 }, metricValue: { color: "#F4F7F0", fontSize: 12, fontWeight: "800", marginTop: 3 }, mealTabs: { flexDirection: "row", gap: 7, marginTop: 3 }, mealTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 11, backgroundColor: "#1B231D" }, mealTabActive: { backgroundColor: "#2C3B25", borderWidth: 1, borderColor: mint }, mealTabText: { color: muted, fontSize: 10, fontWeight: "800" }, mealTabTextActive: { color: mint }, meal: { backgroundColor: "#1B231D", borderRadius: 16, padding: 13, borderWidth: 1, borderColor: "#263128", gap: 10 }, mealTop: { flexDirection: "row", justifyContent: "space-between" }, mealTitle: { color: "#F4F7F0", fontSize: 15, fontWeight: "800" }, mealTotal: { color: mint, fontSize: 11, fontWeight: "800" }, logged: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#2D392E", paddingTop: 8 }, loggedName: { color: muted, fontSize: 11 }, loggedAction: { color: mint, fontSize: 10, fontWeight: "800" }, emptyMeal: { color: muted, fontSize: 11, lineHeight: 16 }, addMeal: { borderTopWidth: 1, borderTopColor: "#2D392E", paddingTop: 9 }, addMealText: { color: mint, fontSize: 11, fontWeight: "800" }, recipe: { backgroundColor: mint, borderRadius: 15, padding: 14, flexDirection: "row", justifyContent: "center", gap: 8 }, recipeText: { color: "#111513", fontWeight: "800", fontSize: 13 }, note: { color: "#718071", fontSize: 11, lineHeight: 16 }
});
