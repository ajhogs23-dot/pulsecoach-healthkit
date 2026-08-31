import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { appDestinationFromPrompt, workoutFocusFromPrompt } from "@/lib/coach-intents";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const starterPrompts = [
  "What should I eat for dinner?",
  "Plan an upper-body workout",
  "I only have 30 minutes today",
  "Why am I feeling low on energy?",
];

export default function CoachScreen() {
  const [listening, setListening] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [recognitionMessage, setRecognitionMessage] = useState("");
  const [reply, setReply] = useState(
    "I can help you choose a meal, plan a workout, or make sense of your progress.",
  );

  const coachMutation = trpc.coach.ask.useMutation({
    onSuccess: (data) => setReply(data.text),
    onError: () =>
      setReply(
        "I couldn’t reach the coach just now. Try again, or use the meal and workout guides while you’re offline.",
      ),
  });

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setRecognitionMessage("Listening… speak naturally, then tap stop when you’re finished.");
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (!transcript) return;

    setPrompt(transcript);
    if (event.isFinal) {
      setRecognitionMessage("Voice command recognized.");
      ask(transcript);
    } else {
      setRecognitionMessage("Hearing you… you can keep speaking or stop when ready.");
    }
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    setRecognitionMessage((current) =>
      current === "Listening… speak naturally, then tap stop when you’re finished."
        ? "Listening ended. Review your prompt or try again."
        : current,
    );
  });

  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    const message = event.message?.trim();
    const unavailable =
      event.error === "not-allowed" ||
      event.error === "service-not-allowed" ||
      event.error === "language-not-supported";
    setRecognitionMessage(
      unavailable
        ? "Speech recognition is unavailable or permission was denied. Enable Microphone and Speech Recognition in Settings, then try again."
        : message
          ? `Speech recognition error: ${message}`
          : "Speech recognition stopped unexpectedly. Check your microphone and try again.",
    );
  });

  function ask(text: string) {
    const message = text.trim();
    if (!message) return;
    setPrompt(message);
    const destination = appDestinationFromPrompt(message);
    if (destination) {
      const paths = { run: "/run", walk: "/walk", cycle: "/cycle", gym: "/gym", nutrition: "/nutrition", supplements: "/supplements", recipes: "/recipes", progress: "/progress", history: "/history" } as const;
      setReply(`Opening ${destination} for you now.`); setRecognitionMessage(""); if (listening) ExpoSpeechRecognitionModule.stop(); setListening(false); router.push(paths[destination] as any); return;
    }
    const workoutFocus = workoutFocusFromPrompt(message);
    if (workoutFocus) {
      setReply(`Great—let’s build a ${workoutFocus.toLowerCase()} workout for today.`);
      setRecognitionMessage("");
      if (listening) ExpoSpeechRecognitionModule.stop();
      setListening(false);
      router.push({ pathname: "/(tabs)/workout", params: { focus: workoutFocus, fresh: "1" } } as any);
      return;
    }
    setReply("Thinking through the most useful next step…");
    setRecognitionMessage("");
    if (listening) ExpoSpeechRecognitionModule.stop();
    setListening(false);
    coachMutation.mutate({
      message,
      goal: "Build strength and improve fitness",
      preferences: "No preference set yet",
      equipment: "Dumbbells and bodyweight",
      healthContext: "Only user-approved data is available; do not infer missing values.",
    });
  }

  const toggleListening = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      setRecognitionMessage("Stopping listening…");
      return;
    }

    setRecognitionMessage("");
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setRecognitionMessage(
        "Speech recognition is not available on this device. You can type your prompt instead.",
      );
      return;
    }

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setRecognitionMessage(
          "Microphone or speech-recognition permission was denied. Enable both permissions in Settings, or type your prompt instead.",
        );
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: "en-AU",
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
        contextualStrings: ["VELTURA", "macros", "creatine", "HealthKit", "chest workout", "gym", "treadmill", "pantry", "supplements"],
        iosTaskHint: "search",
      });
    } catch {
      setListening(false);
      setRecognitionMessage(
        "VELTURA could not start speech recognition. Check microphone access or type your prompt instead.",
      );
    }
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>YOUR COACH</Text>
        <Text style={styles.title}>What are we working on?</Text>
        <Text style={styles.subtitle}>
          Ask naturally. I’ll use your goals and connected health data to help you make the next choice.
        </Text>

        <View style={styles.chatCard}>
          <View style={styles.coachRow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>⌁</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coachName}>VELTURA</Text>
              <Text style={styles.coachStatus}>
                {listening ? "Listening now" : coachMutation.isPending ? "Thinking" : "Ready when you are"}
              </Text>
            </View>
            <View style={[styles.dot, listening && { backgroundColor: mint }]} />
          </View>

          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{reply}</Text>
            {prompt ? <Text style={styles.transcript}>“{prompt}”</Text> : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.listenButton, pressed && styles.pressed]}
            onPress={toggleListening}
            accessibilityRole="button"
            accessibilityLabel={listening ? "Stop listening" : "Tap to speak"}
          >
            <IconSymbol name={listening ? "stop.fill" : "mic.fill"} size={24} color="#111513" />
            <Text style={styles.listenText}>{listening ? "Stop listening" : "Tap to speak"}</Text>
          </Pressable>

          {recognitionMessage ? <Text style={styles.recognitionMessage}>{recognitionMessage}</Text> : null}

          <View style={styles.inputRow}>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Or type a question…"
              placeholderTextColor="#718071"
              style={styles.input}
              onSubmitEditing={() => ask(prompt)}
              returnKeyType="done"
              editable={!coachMutation.isPending}
              accessibilityLabel="Coach prompt"
            />
            <Pressable
              style={({ pressed }) => [styles.send, pressed && styles.pressed]}
              onPress={() => ask(prompt)}
              accessibilityRole="button"
              accessibilityLabel="Send prompt to VELTURA"
            >
              <IconSymbol name="arrow.up" size={18} color="#111513" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>Try asking</Text>
        {starterPrompts.map((text) => (
          <Pressable
            key={text}
            style={({ pressed }) => [styles.promptCard, pressed && styles.pressed]}
            onPress={() => ask(text)}
          >
            <Text style={styles.promptText}>{text}</Text>
            <IconSymbol name="arrow.up.right" size={19} color={mint} />
          </Pressable>
        ))}
        <Text style={styles.note}>
          AI coaching is designed for general wellness guidance. It does not diagnose or treat medical conditions.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30, gap: 15 },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: muted, fontSize: 14, lineHeight: 20 },
  chatCard: {
    backgroundColor: "#1B231D",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2D392E",
    gap: 16,
    marginTop: 8,
  },
  coachRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2C3B25",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: mint, fontSize: 31 },
  coachName: { color: "#F4F7F0", fontSize: 15, fontWeight: "800" },
  coachStatus: { color: muted, fontSize: 12, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#657065" },
  bubble: { backgroundColor: "#232D24", borderRadius: 17, padding: 15 },
  bubbleText: { color: "#DCE5D8", fontSize: 15, lineHeight: 22 },
  transcript: { color: mint, fontSize: 12, lineHeight: 18, marginTop: 10, fontStyle: "italic" },
  listenButton: {
    backgroundColor: mint,
    borderRadius: 17,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  listenText: { color: "#111513", fontSize: 15, fontWeight: "800" },
  recognitionMessage: { color: mint, fontSize: 12, lineHeight: 17, marginTop: -6 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#111513",
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: "#F4F7F0",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#2D392E",
  },
  send: { width: 44, borderRadius: 13, backgroundColor: mint, alignItems: "center", justifyContent: "center" },
  section: { color: "#F4F7F0", fontSize: 18, fontWeight: "800", marginTop: 8 },
  promptCard: {
    backgroundColor: "#1B231D",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#263128",
  },
  promptText: { color: "#E5EDE0", fontSize: 14, fontWeight: "700" },
  note: { color: "#718071", fontSize: 11, lineHeight: 16, marginTop: 5 },
});
