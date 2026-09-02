import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { loadExerciseMedia, type ExerciseMedia } from "@/lib/exercise-media";
import { EXERCISE_IMAGE_ASSETS } from "@/lib/exercise-image-assets";

type Props = { exerciseId: string; exerciseName: string; size?: number };

export function ExerciseThumbnail({ exerciseId, exerciseName, size = 64 }: Props) {
  const [media, setMedia] = useState<ExerciseMedia>();
  const approvedImage = EXERCISE_IMAGE_ASSETS[exerciseId];

  useEffect(() => {
    if (approvedImage) return;
    let active = true;
    void loadExerciseMedia(exerciseId, exerciseName).then((result) => {
      if (active) setMedia(result);
    });
    return () => { active = false; };
  }, [approvedImage, exerciseId, exerciseName]);

  return <View style={[styles.frame, { width: size, height: size }]}> 
    {approvedImage || media?.imageUrl
      ? <Image source={approvedImage ?? { uri: media?.imageUrl }} style={styles.image} contentFit="cover" cachePolicy="disk" transition={180} />
      : <IconSymbol name="figure.strengthtraining.traditional" size={Math.round(size * 0.45)} color="#B8F36B" />}
  </View>;
}

const styles = StyleSheet.create({
  frame: { borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10, 43, 67, 0.72)", borderWidth: 1, borderColor: "rgba(184, 243, 107, 0.42)" },
  image: { width: "100%", height: "100%" },
});
