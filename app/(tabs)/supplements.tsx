import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { searchSupplementProducts, type CatalogueItem } from "@/lib/food-catalogue";

const mint = "#B8F36B";
const muted = "#A8B3A6";

export default function SupplementsScreen() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<CatalogueItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setMatches([]);
      setSearching(false);
      setSearchMessage("");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      setSearchMessage("");
      void searchSupplementProducts(term, controller.signal)
        .then((results) => {
          setMatches(results);
          if (!results.length) setSearchMessage("No product with usable label nutrition was found. Scan the label or add a private confirmed entry.");
        })
        .catch((error) => {
          if (error instanceof Error && error.name === "AbortError") return;
          setMatches([]);
          setSearchMessage("The live catalogue could not be reached. Scan the label or try again.");
        })
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const add = (nameToAdd: string) => {
    setItems((current) => current.includes(nameToAdd) ? current : [nameToAdd, ...current]);
  };

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>SUPPLEMENTS</Text>
      <Text style={styles.title}>Keep your cabinet clear.</Text>
      <Text style={styles.subtitle}>Search live product data, scan a package, then confirm the exact flavour and serving before adding it.</Text>

      <View style={styles.search}>
        <IconSymbol name="magnifyingglass" size={18} color={muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search protein, creatine, brand or flavour" placeholderTextColor="#718071" style={styles.searchInput} />
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => router.push("/scan?mode=supplement" as any)}><IconSymbol name="barcode.viewfinder" size={17} color={mint} /><Text style={styles.actionText}>Scan barcode</Text></Pressable>
        <Pressable style={styles.action} onPress={() => router.push("/scan?mode=supplement" as any)}><IconSymbol name="camera.fill" size={17} color={mint} /><Text style={styles.actionText}>Label photo</Text></Pressable>
      </View>

      <View style={styles.timing}>
        <Text style={styles.cardTitle}>Today’s timing</Text>
        <Text style={styles.timingLine}><Text style={styles.time}>Morning</Text> Check label directions and personal context</Text>
        <Text style={styles.timingLine}><Text style={styles.time}>Before workout</Text> Confirm caffeine and overlapping ingredients</Text>
        <Text style={styles.timingLine}><Text style={styles.time}>Post-workout</Text> Log powder nutrition only once</Text>
      </View>

      {query.trim().length > 1 ? <View style={styles.results}>
        <Text style={styles.section}>Live product matches</Text>
        {searching ? <Text style={styles.searchStatus}>Searching Australian and global products…</Text> : null}
        {searchMessage ? <Text style={styles.empty}>{searchMessage}</Text> : null}
        {matches.map((item) => <Pressable key={item.id} style={styles.product} onPress={() => add(item.name)}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.productImage} contentFit="contain" transition={150} /> : <View style={styles.icon}><Text style={styles.iconText}>{item.name[0]}</Text></View>}
          <View style={styles.productBody}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productMeta}>{item.brand} · {item.detail}</Text>
            <Text style={styles.productSource}>{item.source}{item.stores ? ` · ${item.stores}` : ""}</Text>
          </View>
          <Text style={styles.add}>Add</Text>
        </Pressable>)}
      </View> : null}

      <View style={styles.sectionRow}><Text style={styles.section}>Your cabinet</Text><Pressable onPress={() => setShowAdd(!showAdd)}><Text style={styles.link}>{showAdd ? "Close" : "+ Add"}</Text></Pressable></View>
      {showAdd ? <View style={styles.form}>
        <TextInput value={name} onChangeText={setName} placeholder="Supplement or powder name" placeholderTextColor="#718071" style={styles.input} />
        <Pressable style={styles.button} onPress={() => { if (name.trim()) { add(name.trim()); setName(""); setShowAdd(false); } }}><Text style={styles.buttonText}>Add confirmed product</Text></Pressable>
      </View> : null}
      {(items.length ? items : ["Whey protein", "Pre-workout"]).map((item) => <View style={styles.item} key={item}>
        <View style={styles.icon}><IconSymbol name="pills.fill" size={19} color={mint} /></View>
        <View style={styles.productBody}><Text style={styles.productName}>{item}</Text><Text style={styles.productMeta}>Serving and active ingredients · review label</Text><Text style={styles.productSource}>Schedule · servings remaining · taken log</Text></View>
        <IconSymbol name="chevron.right" size={18} color={muted} />
      </View>)}
      <View style={styles.notice}><Text style={styles.noticeTitle}>Duplicate-ingredient check</Text><Text style={styles.noticeCopy}>PulseCoach will flag overlapping caffeine, vitamins, or minerals across selected products. Check the label and ask a pharmacist or doctor when unsure.</Text></View>
      <Text style={styles.note}>Live results currently come from Open Food Facts. Some vitamins and specialist supplements will still require a barcode, label photo, or manual confirmed entry until another licensed supplement source is connected.</Text>
      <Pressable style={styles.secondary} onPress={() => router.push("/peptides" as any)}><IconSymbol name="book.fill" size={18} color={mint} /><Text style={styles.secondaryText}>Open research library</Text></Pressable>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36, gap: 13 },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800" },
  subtitle: { color: muted, fontSize: 14, lineHeight: 20 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#111513", borderRadius: 14, borderWidth: 1, borderColor: "#3B4A3B", paddingHorizontal: 13 },
  searchInput: { flex: 1, color: "#F4F7F0", paddingVertical: 14 },
  actions: { flexDirection: "row", gap: 9 },
  action: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#2B3B27", borderRadius: 13, padding: 12 },
  actionText: { color: mint, fontWeight: "800", fontSize: 12 },
  timing: { backgroundColor: "#202A21", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#354536", gap: 9 },
  cardTitle: { color: "#F4F7F0", fontSize: 16, fontWeight: "800" },
  timingLine: { color: muted, fontSize: 11, lineHeight: 16 },
  time: { color: mint, fontWeight: "800" },
  results: { backgroundColor: "#1B231D", borderRadius: 17, padding: 13, gap: 9, borderWidth: 1, borderColor: "#354536" },
  searchStatus: { color: muted, fontSize: 11, fontStyle: "italic" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  section: { color: "#F4F7F0", fontSize: 18, fontWeight: "800" },
  link: { color: mint, fontWeight: "800", fontSize: 12 },
  product: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  productBody: { flex: 1 },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center" },
  productImage: { width: 42, height: 42, borderRadius: 10, backgroundColor: "#F4F7F0" },
  iconText: { color: mint, fontWeight: "900" },
  productName: { color: "#F4F7F0", fontSize: 13, fontWeight: "800" },
  productMeta: { color: muted, fontSize: 10, marginTop: 3 },
  productSource: { color: mint, fontSize: 9, fontWeight: "700", marginTop: 3 },
  add: { color: mint, fontSize: 11, fontWeight: "800" },
  empty: { color: muted, fontSize: 12, lineHeight: 17 },
  form: { backgroundColor: "#1B231D", borderRadius: 16, padding: 13, gap: 10 },
  input: { backgroundColor: "#111513", color: "#F4F7F0", borderRadius: 12, padding: 13, borderWidth: 1, borderColor: "#2D392E" },
  button: { backgroundColor: mint, borderRadius: 13, padding: 13, alignItems: "center" },
  buttonText: { color: "#111513", fontWeight: "800" },
  item: { backgroundColor: "#1B231D", borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#263128" },
  notice: { backgroundColor: "#2A241A", borderRadius: 17, padding: 15, borderWidth: 1, borderColor: "#57482D" },
  noticeTitle: { color: "#F7CF77", fontSize: 13, fontWeight: "800" },
  noticeCopy: { color: "#D4C39D", fontSize: 11, lineHeight: 16, marginTop: 5 },
  note: { color: "#718071", fontSize: 11, lineHeight: 16 },
  secondary: { flexDirection: "row", justifyContent: "center", gap: 8, padding: 12 },
  secondaryText: { color: mint, fontWeight: "800" },
});
