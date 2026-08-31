import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { commonFoods } from "@/lib/food-catalogue";
import { trpc } from "@/lib/trpc";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const starter = ["Eggs", "Greek yoghurt", "Rice", "Spinach", "Chicken", "Berries"];
const extraIngredients = ["Tomato", "Onion", "Garlic", "Capsicum", "Mushrooms", "Carrot", "Zucchini", "Broccoli", "Cauliflower", "Peas", "Corn", "Cucumber", "Lettuce", "Cabbage", "Pumpkin", "Potato", "Sweet potato", "Green beans", "Lentils", "Black beans", "Kidney beans", "Chickpeas", "Quinoa", "Couscous", "Noodles", "Wholemeal pasta", "Turkey", "Pork", "Lean beef", "Salmon", "Tuna", "Prawns", "Tofu", "Tempeh", "Feta", "Cottage cheese", "Milk", "Oats", "Banana", "Apple", "Orange", "Lemon", "Lime", "Avocado", "Fresh herbs", "Frozen vegetables"];
const foodImages = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1547592180-85f173990554?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1000&auto=format&fit=crop",
];

type RecipeIdea = { id: string; title: string; blurb: string; minutes: number; emoji: string; uses: string[]; needs: string[] };
const clean = (value: string) => value.trim().replace(/\s+/g, " ");
const titleCase = (value: string) => clean(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
const fallbackIdeas = (ingredients: string[]): RecipeIdea[] => ingredients.slice(-8).reverse().map((item, index) => ({ id: `fallback-${index}`, title: `${item} inspiration`, blurb: `A fresh meal idea centred on ${item.toLowerCase()} and your other saved ingredients.`, minutes: 20 + index % 3 * 5, emoji: ["🍲", "🥗", "🍳", "🥘"][index % 4], uses: [item, ...ingredients.filter((value) => value !== item).slice(0, 2)], needs: [] }));

function parseIdeas(text: string, pantry: string[]): RecipeIdea[] {
  try {
    const start = text.indexOf("{"); const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return [];
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed.recipes)) return [];
    return parsed.recipes.slice(0, 12).flatMap((item: any, index: number): RecipeIdea[] => {
      if (!item?.title || !item?.blurb) return [];
      return [{ id: `ai-${Date.now()}-${index}`, title: String(item.title), blurb: String(item.blurb), minutes: Math.max(5, Number(item.minutes) || 25), emoji: String(item.emoji || "🍽️"), uses: Array.isArray(item.uses) ? item.uses.map(String).slice(0, 6) : pantry.slice(0, 4), needs: Array.isArray(item.needs) ? item.needs.map(String).slice(0, 5) : [] }];
    });
  } catch { return []; }
}

export default function RecipesScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = user?.openId ?? (user?.id ? String(user.id) : "local-user");
  const pantryKey = `pulsecoach.pantry.${userKey}`;
  const ideasKey = `veltura.pantry-recipes.${userKey}`;
  const [ingredients, setIngredients] = useState<string[]>(starter);
  const [input, setInput] = useState("");
  const [ideas, setIdeas] = useState<RecipeIdea[]>([]);
  const [message, setMessage] = useState("Add ingredients, then ask VELTURA for fresh ideas.");
  const [openId, setOpenId] = useState<string>();
  const [detail, setDetail] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  const discovery = trpc.coach.ask.useMutation({
    onSuccess: ({ text }) => {
      const next = parseIdeas(text, ingredients);
      const savedIdeas = next.length ? next : fallbackIdeas(ingredients);
      setIdeas(savedIdeas);
      void AsyncStorage.setItem(ideasKey, JSON.stringify(savedIdeas));
      setMessage(next.length ? `${next.length} new ideas created from your pantry.` : "VELTURA returned a shorter set. Tap More ideas to try again.");
    },
    onError: () => { setIdeas(fallbackIdeas(ingredients)); setMessage("AI is temporarily unavailable. Showing ingredient-based ideas while you retry."); },
  });
  const recipeDetail = trpc.coach.ask.useMutation({
    onSuccess: ({ text }) => { setDetail(text); setDetailLoading(false); },
    onError: () => { setDetail("The full recipe could not be created just now. Check your connection and tap Try again."); setDetailLoading(false); },
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([AsyncStorage.getItem(pantryKey), AsyncStorage.getItem(ideasKey)]).then(([raw, savedIdeas]) => { if (!active) return; if (raw) { try { setIngredients(JSON.parse(raw)); } catch {} } if (savedIdeas) { try { setIdeas(JSON.parse(savedIdeas)); setMessage("Your latest AI recipe ideas are ready."); } catch {} } });
    return () => { active = false; };
  }, [ideasKey, pantryKey]));

  const catalogue = useMemo(() => [...new Set([...commonFoods.map((item) => item.name), ...extraIngredients])].sort(), []);
  const suggestions = useMemo(() => { const term = clean(input).toLowerCase(); if (!term) return []; const saved = new Set(ingredients.map((item) => item.toLowerCase())); return catalogue.filter((item) => !saved.has(item.toLowerCase()) && item.toLowerCase().includes(term)).sort((a, b) => Number(!a.toLowerCase().startsWith(term)) - Number(!b.toLowerCase().startsWith(term)) || a.localeCompare(b)).slice(0, 6); }, [catalogue, ingredients, input]);
  const save = (next: string[]) => { setIngredients(next); setIdeas([]); setOpenId(undefined); setDetail(""); setMessage("Pantry changed. Ask VELTURA for recipes using the new list."); void AsyncStorage.multiSet([[pantryKey, JSON.stringify(next)], [ideasKey, "[]"]]); };
  const addIngredient = (value = input) => { const nextItem = titleCase(value); if (!nextItem) return; if (!ingredients.some((item) => item.toLowerCase() === nextItem.toLowerCase())) save([...ingredients, nextItem]); setInput(""); };
  const discover = () => {
    if (!ingredients.length) return setMessage("Add at least one ingredient first.");
    setIdeas([]); setOpenId(undefined); setDetail(""); setMessage("VELTURA is creating a varied recipe feed…");
    discovery.mutate({ message: `Return ONLY compact valid JSON, no markdown: {"recipes":[{"title":"","blurb":"","minutes":25,"emoji":"🍲","uses":[""],"needs":[""]}]}. Create 8 genuinely different, healthy, appetising recipe ideas using as many of these pantry ingredients as sensible: ${ingredients.join(", ")}. Vary cuisines and methods. Do not repeat generic bowls, skillets or mixes. "uses" must list pantry items actually used; "needs" lists only a few optional extras.`, preferences: "Practical home cooking. Ingredient matches must be honest. Avoid unsafe food handling advice." });
  };
  const openRecipe = (idea: RecipeIdea) => {
    if (openId === idea.id) { setOpenId(undefined); return; }
    setOpenId(idea.id); setDetail(""); setDetailLoading(true);
    recipeDetail.mutate({ message: `Create the complete recipe for "${idea.title}". Pantry: ${ingredients.join(", ")}. Give: a short appealing introduction, servings, prep and cook time, exact ingredient quantities, optional substitutions, and clearly numbered cooking steps. Prioritise pantry ingredients, identify extra ingredients, include food-safety temperatures or doneness where relevant, and do not invent dietary or allergen safety. Plain text with clear headings, no markdown table.`, preferences: "Healthy, exciting, realistic home recipe using the listed pantry." });
  };

  return <ScreenContainer className="px-5 pt-4"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable><Text style={styles.eyebrow}>AI PANTRY RECIPES</Text><Text style={styles.title}>Find something exciting.</Text><Text style={styles.subtitle}>VELTURA uses your confirmed ingredients to create a changing feed of recipe ideas. Open only the ones that appeal to you.</Text>
    <Pressable style={styles.camera} onPress={() => router.push("/scan?mode=pantry&capture=photo" as any)}><IconSymbol name="camera.fill" size={20} color="#111513" /><Text style={styles.cameraText}>Photograph pantry ingredients</Text></Pressable>
    <View style={styles.addRow}><TextInput value={input} onChangeText={setInput} onSubmitEditing={() => addIngredient()} placeholder="Search or add an ingredient" placeholderTextColor="#718071" style={styles.input} returnKeyType="done" autoCapitalize="words" /><Pressable style={styles.add} onPress={() => addIngredient()}><Text style={styles.addText}>Add</Text></Pressable></View>
    {suggestions.length ? <View style={styles.suggestions}><Text style={styles.suggestionLabel}>INGREDIENT SUGGESTIONS</Text>{suggestions.map((item) => <Pressable key={item} style={styles.suggestion} onPress={() => addIngredient(item)}><Text style={styles.suggestionText}>{item}</Text><Text style={styles.suggestionAdd}>+ Add</Text></Pressable>)}</View> : null}
    <View style={styles.chips}>{ingredients.map((item) => <Pressable style={styles.chip} key={item} onPress={() => save(ingredients.filter((value) => value !== item))}><Text style={styles.chipText}>{item} ×</Text></Pressable>)}</View>
    <Pressable style={[styles.discover, discovery.isPending && styles.disabled]} disabled={discovery.isPending} onPress={discover}><IconSymbol name="sparkles" size={19} color="#111513" /><Text style={styles.discoverText}>{discovery.isPending ? "Creating recipe ideas…" : ideas.length ? "Show me more ideas" : "Find recipes with AI"}</Text></Pressable>
    <Text style={styles.message}>{message}</Text>
    {ideas.length ? <View style={styles.filterRow}><Text style={styles.section}>Made for your pantry</Text><Text style={styles.filter}>{ideas.length} ideas</Text></View> : null}
    {ideas.map((idea, index) => <View key={idea.id} style={styles.card}>
      <Pressable onPress={() => openRecipe(idea)}><View style={styles.hero}><Image source={{ uri: foodImages[index % foodImages.length] }} contentFit="cover" transition={250} style={StyleSheet.absoluteFill} /><View style={styles.heroShade} /><View style={styles.heroBadge}><Text style={styles.heroEmoji}>{idea.emoji}</Text><Text style={styles.heroMinutes}>{idea.minutes} min</Text></View><View style={styles.heroText}><Text style={styles.recipeTitle}>{idea.title}</Text><Text style={styles.recipeBlurb}>{idea.blurb}</Text></View></View></Pressable>
      <View style={styles.cardBody}><View style={styles.tags}>{idea.uses.slice(0, 4).map((item) => <View key={item} style={styles.tag}><Text style={styles.tagText}>{item}</Text></View>)}</View>{idea.needs.length ? <Text style={styles.needs}>Optional extras: {idea.needs.join(", ")}</Text> : <Text style={styles.needs}>Uses your pantry with basic seasoning.</Text>}
      {openId === idea.id ? <View style={styles.detail}><Text style={styles.detailTitle}>{detailLoading ? "VELTURA is writing the full recipe…" : "Full recipe"}</Text>{detailLoading ? <Text style={styles.detailCopy}>Adding quantities, substitutions and cooking steps.</Text> : <Text style={styles.detailCopy}>{detail}</Text>}{!detailLoading && detail.startsWith("The full recipe") ? <Pressable onPress={() => openRecipe({ ...idea, id: `${idea.id}-retry` })}><Text style={styles.retry}>Try again</Text></Pressable> : null}</View> : null}
      <Pressable style={styles.open} onPress={() => openRecipe(idea)}><Text style={styles.openText}>{openId === idea.id ? "Close recipe" : "See full recipe"}</Text><Text style={styles.openArrow}>{openId === idea.id ? "⌃" : "›"}</Text></Pressable></View>
    </View>)}
    <Text style={styles.note}>AI recipes and images are inspiration. Confirm labels, portions, allergens, use-by dates and safe cooking requirements yourself.</Text>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 35, gap: 14 }, back: { color: mint, fontWeight: "800" }, eyebrow: { color: mint, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "900" }, subtitle: { color: muted, fontSize: 13, lineHeight: 19 }, camera: { backgroundColor: mint, padding: 14, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, cameraText: { color: "#111513", fontWeight: "900" }, addRow: { flexDirection: "row", gap: 8 }, input: { flex: 1, backgroundColor: "rgba(66,132,174,0.38)", color: "#F4F7F0", borderRadius: 13, padding: 13, borderWidth: 1, borderColor: "rgba(174,224,255,0.46)" }, add: { backgroundColor: mint, borderRadius: 13, paddingHorizontal: 17, justifyContent: "center" }, addText: { color: "#111513", fontWeight: "900" }, suggestions: { marginTop: -7, backgroundColor: "rgba(43,104,145,0.78)", borderRadius: 14, padding: 9, borderWidth: 1, borderColor: "rgba(174,224,255,0.58)" }, suggestionLabel: { color: "#9FDAFF", fontSize: 9, fontWeight: "900", letterSpacing: 1, padding: 5 }, suggestion: { flexDirection: "row", justifyContent: "space-between", padding: 9, borderTopWidth: 1, borderTopColor: "rgba(174,224,255,0.2)" }, suggestionText: { color: "#F4F7F0", fontWeight: "700" }, suggestionAdd: { color: mint, fontSize: 11, fontWeight: "900" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { backgroundColor: "rgba(54,119,161,0.46)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 }, chipText: { color: mint, fontSize: 11, fontWeight: "800" }, discover: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, padding: 15, borderRadius: 15, backgroundColor: mint }, discoverText: { color: "#111513", fontWeight: "900" }, disabled: { opacity: 0.65 }, message: { color: muted, fontSize: 11, lineHeight: 16, textAlign: "center" }, filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, section: { color: "#F4F7F0", fontSize: 18, fontWeight: "900" }, filter: { color: mint, fontSize: 11, fontWeight: "800" }, card: { borderRadius: 21, overflow: "hidden", backgroundColor: "rgba(66,132,174,0.40)", borderWidth: 1, borderColor: "rgba(174,224,255,0.48)" }, hero: { height: 225, justifyContent: "space-between", padding: 15 }, heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4,18,29,0.40)" }, heroBadge: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, heroEmoji: { fontSize: 30 }, heroMinutes: { color: "#F4F7F0", fontSize: 11, fontWeight: "900", backgroundColor: "rgba(5,24,38,0.72)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 }, heroText: { marginTop: "auto" }, recipeTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 6 }, recipeBlurb: { color: "#EAF3F6", fontSize: 12, lineHeight: 17, marginTop: 6 }, cardBody: { padding: 14, gap: 10 }, tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, tag: { borderRadius: 10, backgroundColor: "rgba(13,51,76,0.55)", paddingHorizontal: 9, paddingVertical: 6 }, tagText: { color: "#9FDAFF", fontSize: 10, fontWeight: "800" }, needs: { color: muted, fontSize: 10.5 }, detail: { padding: 13, borderRadius: 14, backgroundColor: "rgba(7,35,55,0.56)", borderWidth: 1, borderColor: "rgba(174,224,255,0.30)" }, detailTitle: { color: mint, fontWeight: "900", marginBottom: 7 }, detailCopy: { color: "#EAF3F6", fontSize: 12, lineHeight: 19 }, retry: { color: mint, fontWeight: "900", marginTop: 8 }, open: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }, openText: { color: mint, fontWeight: "900" }, openArrow: { color: mint, fontSize: 24 }, note: { color: "#879995", fontSize: 10.5, lineHeight: 16, textAlign: "center" },
});
