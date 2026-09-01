import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { loadExerciseFavorites, toggleExerciseFavorite } from "@/lib/exercise-favorites";
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, type ExerciseEquipment, type MuscleGroup } from "@/lib/exercise-library";
import { loadExerciseMedia } from "@/lib/exercise-media";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const equipment: ("All" | ExerciseEquipment)[] = ["All", "Bodyweight", "Dumbbells", "Full gym"];
const groupIcons: Record<string, string> = { Chest: "heart.fill", Back: "figure.strengthtraining.traditional", Shoulders: "figure.arms.open", Arms: "dumbbell.fill", Legs: "figure.walk", Core: "figure.core.training", Cardio: "heart.circle.fill" };
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

function ExerciseCard({ exercise, favorite, onFavorite }: { exercise: (typeof EXERCISE_LIBRARY)[number]; favorite: boolean; onFavorite: () => void }) {
  const [imageUrl, setImageUrl] = useState<string>();
  useEffect(() => { let active = true; void loadExerciseMedia(exercise.id, exercise.name).then((media) => { if (active) setImageUrl(media?.imageUrl); }); return () => { active = false; }; }, [exercise.id, exercise.name]);
  return <Pressable style={styles.card} onPress={() => router.push(`/exercise/${exercise.id}` as any)}>
    <View style={styles.imageWrap}>{imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" cachePolicy="disk" /> : <IconSymbol name="figure.strengthtraining.traditional" size={46} color={mint} />}</View>
    <View style={styles.cardBody}><View style={styles.cardTitleRow}><Text numberOfLines={2} style={styles.cardTitle}>{exercise.name}</Text><Pressable hitSlop={10} onPress={(event) => { event.stopPropagation(); onFavorite(); }}><IconSymbol name={favorite ? "bookmark.fill" : "bookmark"} size={18} color={favorite ? mint : muted} /></Pressable></View><Text style={styles.cardMeta}>{exercise.focus}</Text><Text style={styles.cardEquipment}>{exercise.equipment.join(" · ")}</Text></View>
  </Pressable>;
}

export default function ExercisesScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup>("Full body");
  const [setup, setSetup] = useState<"All" | ExerciseEquipment>("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  useEffect(() => { void loadExerciseFavorites(userKey).then(setFavorites); }, [userKey]);
  const results = useMemo(() => EXERCISE_LIBRARY.filter((exercise) => (group === "Full body" || exercise.muscleGroup === group) && (setup === "All" || exercise.equipment.includes(setup)) && (!favoritesOnly || favorites.includes(exercise.id)) && `${exercise.name} ${exercise.focus} ${exercise.muscleGroup}`.toLowerCase().includes(query.trim().toLowerCase())), [favorites, favoritesOnly, group, query, setup]);
  const toggle = async (id: string) => setFavorites(await toggleExerciseFavorite(userKey, id));
  return <ScreenContainer className="px-5 pt-4"><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable><View style={styles.flex}><Text style={styles.eyebrow}>PULSECOACH LIBRARY</Text><Text style={styles.title}>Explore exercises</Text></View><Pressable style={[styles.favoriteButton, favoritesOnly && styles.favoriteButtonActive]} onPress={() => setFavoritesOnly((value) => !value)}><IconSymbol name={favoritesOnly ? "bookmark.fill" : "bookmark"} size={20} color={favoritesOnly ? "#111513" : mint} /></Pressable></View>
    <View style={styles.search}><IconSymbol name="magnifyingglass" size={20} color={muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search every exercise" placeholderTextColor="#718071" style={styles.searchInput} /></View>
    <Text style={styles.section}>Muscle groups</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groups}><Pressable style={[styles.group, group === "Full body" && styles.groupActive]} onPress={() => setGroup("Full body")}><IconSymbol name="figure.strengthtraining.traditional" size={25} color={group === "Full body" ? "#111513" : mint} /><Text style={[styles.groupText, group === "Full body" && styles.groupTextActive]}>All</Text></Pressable>{MUSCLE_GROUPS.map((item) => <Pressable key={item} style={[styles.group, group === item && styles.groupActive]} onPress={() => setGroup(item)}><IconSymbol name={groupIcons[item] as any} size={25} color={group === item ? "#111513" : mint} /><Text style={[styles.groupText, group === item && styles.groupTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    <Text style={styles.section}>Equipment</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{equipment.map((item) => <Pressable key={item} style={[styles.filter, setup === item && styles.filterActive]} onPress={() => setSetup(item)}><Text style={[styles.filterText, setup === item && styles.filterTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    <View style={styles.resultsHeader}><Text style={styles.section}>{group === "Full body" ? "All exercises" : group}</Text><Text style={styles.count}>{results.length} exercises</Text></View>
    <View style={styles.grid}>{results.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} favorite={favorites.includes(exercise.id)} onFavorite={() => void toggle(exercise.id)} />)}</View>
    {!results.length ? <Text style={styles.empty}>No exercises match these filters yet.</Text> : null}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { paddingBottom: 40, gap: 14 }, header: { flexDirection: "row", alignItems: "center", gap: 12 }, flex: { flex: 1 }, back: { color: mint, fontWeight: "800" }, eyebrow: { color: mint, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 }, title: { color: "#F4F7F0", fontSize: 27, fontWeight: "900" }, favoriteButton: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#354536" }, favoriteButtonActive: { backgroundColor: mint }, search: { height: 54, borderRadius: 18, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#354536" }, searchInput: { flex: 1, color: "#F4F7F0", fontWeight: "700" }, section: { color: "#F4F7F0", fontSize: 17, fontWeight: "900" }, groups: { gap: 9 }, group: { width: 88, height: 88, borderRadius: 22, alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#354536" }, groupActive: { backgroundColor: mint, borderColor: mint }, groupText: { color: "#DCE5D8", fontSize: 11, fontWeight: "800" }, groupTextActive: { color: "#111513" }, filters: { gap: 8 }, filter: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#354536" }, filterActive: { backgroundColor: "#2C3B25", borderColor: mint }, filterText: { color: muted, fontSize: 11, fontWeight: "800" }, filterTextActive: { color: mint }, resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 }, count: { color: muted, fontSize: 11 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, card: { width: "48.5%", borderRadius: 19, overflow: "hidden", backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#2D392E" }, imageWrap: { height: 130, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4EF" }, image: { width: "100%", height: "100%" }, cardBody: { minHeight: 103, padding: 11, gap: 5 }, cardTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 }, cardTitle: { flex: 1, color: "#F4F7F0", fontSize: 13, lineHeight: 17, fontWeight: "900" }, cardMeta: { color: mint, fontSize: 10, fontWeight: "800" }, cardEquipment: { color: muted, fontSize: 9, lineHeight: 13 }, empty: { color: muted, textAlign: "center", paddingVertical: 30 } });
