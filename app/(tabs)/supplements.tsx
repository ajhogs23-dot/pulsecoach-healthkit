import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { commonSupplements, searchSupplementProducts, type SupplementProduct } from "@/lib/supplement-catalogue";
import { addSupplement, loadSupplements, removeSupplement, type SavedSupplement } from "@/lib/supplement-log";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const userStorageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

export default function SupplementsScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = userStorageKey(user);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<SavedSupplement[]>([]);
  const [remote, setRemote] = useState<SupplementProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [customName, setCustomName] = useState("");

  useEffect(() => { void loadSupplements(userKey).then(setSaved); }, [userKey]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setRemote([]); setLoading(false); setMessage(""); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setMessage("");
      void searchSupplementProducts(term, controller.signal)
        .then(setRemote)
        .catch((error) => {
          if (error instanceof Error && error.name === "AbortError") return;
          setRemote([]);
          setMessage("Online label products could not load. Generic categories and custom entry still work.");
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    const local = term ? commonSupplements.filter((item) => `${item.name} ${item.brand} ${item.activeIngredients ?? ""}`.toLowerCase().includes(term)) : commonSupplements.slice(0, 6);
    const unique = new Map<string, SupplementProduct>();
    [...local, ...remote].forEach((item) => {
      const key = `${item.name}|${item.brand}`.toLowerCase();
      if (!unique.has(key)) unique.set(key, item);
    });
    return [...unique.values()].slice(0, 50);
  }, [query, remote]);

  const add = async (product: SupplementProduct) => {
    setSaved(await addSupplement(userKey, product));
    setQuery("");
    setRemote([]);
  };

  const addCustom = async () => {
    const name = customName.trim();
    if (!name) return;
    await add({ id: `custom-${Date.now()}`, name, brand: "My confirmed product", source: "Private manual entry — confirm label" });
    setCustomName("");
    setShowAdd(false);
  };

  return <ScreenContainer className="px-5 pt-4"><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>SUPPLEMENTS</Text>
    <Text style={styles.title}>Build your real cabinet.</Text>
    <Text style={styles.subtitle}>Search generic supplement types and online product labels, then add only the exact product you use.</Text>
    <View style={styles.search}><IconSymbol name="magnifyingglass" size={18} color={muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search creatine, protein, brands…" placeholderTextColor="#718071" style={styles.searchInput} /></View>
    <View style={styles.actions}><Pressable style={styles.action} onPress={() => router.push("/scan?mode=supplement" as any)}><IconSymbol name="barcode.viewfinder" size={17} color={mint} /><Text style={styles.actionText}>Scan barcode</Text></Pressable><Pressable style={styles.action} onPress={() => router.push("/scan?mode=supplement" as any)}><IconSymbol name="camera.fill" size={17} color={mint} /><Text style={styles.actionText}>Label photo</Text></Pressable></View>

    <View style={styles.results}><Text style={styles.section}>{query ? "Matching products" : "Common supplements"}</Text>{loading ? <Text style={styles.status}>Searching online labels…</Text> : null}{message ? <Text style={styles.empty}>{message}</Text> : null}{matches.map((item) => <Pressable key={item.id} style={styles.product} onPress={() => void add(item)}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="contain" /> : <View style={styles.icon}><Text style={styles.iconText}>{item.name[0]}</Text></View>}<View style={styles.flex}><Text style={styles.productName}>{item.name}</Text><Text style={styles.productMeta}>{item.brand}{item.form ? ` · ${item.form}` : ""}{item.servingLabel ? ` · ${item.servingLabel}` : ""}</Text><Text numberOfLines={2} style={styles.productSource}>{item.activeIngredients ?? "Check active ingredients on label"} · {item.source}</Text></View><Text style={styles.add}>Add</Text></Pressable>)}</View>

    <View style={styles.sectionRow}><Text style={styles.section}>Your cabinet</Text><Pressable onPress={() => setShowAdd((open) => !open)}><Text style={styles.link}>{showAdd ? "Close" : "+ Custom"}</Text></Pressable></View>
    {showAdd ? <View style={styles.form}><TextInput value={customName} onChangeText={setCustomName} placeholder="Exact product name" placeholderTextColor="#718071" style={styles.input} /><Pressable style={styles.button} onPress={() => void addCustom()}><Text style={styles.buttonText}>Add private product</Text></Pressable></View> : null}
    {saved.length ? saved.map((item) => <View style={styles.item} key={item.id}><View style={styles.icon}><IconSymbol name="pills.fill" size={19} color={mint} /></View><View style={styles.flex}><Text style={styles.productName}>{item.name}</Text><Text style={styles.productMeta}>{item.brand}</Text><Text numberOfLines={2} style={styles.productSource}>{item.activeIngredients ?? "Serving and ingredients need label confirmation"}</Text></View><Pressable onPress={() => void removeSupplement(userKey, item.id).then(setSaved)}><Text style={styles.delete}>Delete</Text></Pressable></View>) : <Text style={styles.empty}>Your cabinet is empty. Search or scan the first product you actually use.</Text>}
    <View style={styles.notice}><Text style={styles.noticeTitle}>Label and duplicate check</Text><Text style={styles.noticeCopy}>Product formulas change. Confirm serving directions and overlapping caffeine, vitamins or minerals on the current package. Ask a pharmacist or doctor when unsure.</Text></View>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36, gap: 13 }, flex: { flex: 1 }, eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800" }, subtitle: { color: muted, fontSize: 14, lineHeight: 20 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#111513", borderRadius: 14, borderWidth: 1, borderColor: "#3B4A3B", paddingHorizontal: 13 }, searchInput: { flex: 1, color: "#F4F7F0", paddingVertical: 14 },
  actions: { flexDirection: "row", gap: 9 }, action: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#2B3B27", borderRadius: 13, padding: 12 }, actionText: { color: mint, fontWeight: "800", fontSize: 12 },
  results: { backgroundColor: "#1B231D", borderRadius: 17, padding: 13, gap: 10, borderWidth: 1, borderColor: "#354536" }, sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, section: { color: "#F4F7F0", fontSize: 18, fontWeight: "800" }, status: { color: muted, fontSize: 11, fontStyle: "italic" }, link: { color: mint, fontWeight: "800", fontSize: 12 },
  product: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }, icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center" }, iconText: { color: mint, fontWeight: "900" }, image: { width: 42, height: 42, borderRadius: 10, backgroundColor: "#F4F7F0" },
  productName: { color: "#F4F7F0", fontSize: 13, fontWeight: "800" }, productMeta: { color: muted, fontSize: 10, marginTop: 3 }, productSource: { color: mint, fontSize: 9, fontWeight: "700", marginTop: 3 }, add: { color: mint, fontSize: 11, fontWeight: "800" }, delete: { color: "#F7A6A6", fontSize: 10, fontWeight: "800" }, empty: { color: muted, fontSize: 12, lineHeight: 17 },
  form: { backgroundColor: "#1B231D", borderRadius: 16, padding: 13, gap: 10 }, input: { backgroundColor: "#111513", color: "#F4F7F0", borderRadius: 12, padding: 13, borderWidth: 1, borderColor: "#2D392E" }, button: { backgroundColor: mint, borderRadius: 13, padding: 13, alignItems: "center" }, buttonText: { color: "#111513", fontWeight: "800" },
  item: { backgroundColor: "#1B231D", borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#263128" }, notice: { backgroundColor: "#2A241A", borderRadius: 17, padding: 15, borderWidth: 1, borderColor: "#57482D" }, noticeTitle: { color: "#F7CF77", fontSize: 13, fontWeight: "800" }, noticeCopy: { color: "#D4C39D", fontSize: 11, lineHeight: 16, marginTop: 5 }
});
