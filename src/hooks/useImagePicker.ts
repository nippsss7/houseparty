import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import { Alert } from "react-native";

async function pickFrom(source: "library" | "camera") {
  const permission =
    source === "library"
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      "Permission needed",
      `Please allow ${source === "library" ? "photo library" : "camera"} access in Settings to continue.`
    );
    return null;
  }

  const result =
    source === "library"
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 })
      : await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export function useImagePicker() {
  const pickFromLibrary = useCallback(() => pickFrom("library"), []);
  const pickFromCamera = useCallback(() => pickFrom("camera"), []);

  const pickWithSourceChoice = useCallback(() => {
    return new Promise<string | null>((resolve) => {
      Alert.alert("Add photo", "Choose a source", [
        { text: "Camera", onPress: () => pickFrom("camera").then(resolve) },
        { text: "Photo Library", onPress: () => pickFrom("library").then(resolve) },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ]);
    });
  }, []);

  return { pickFromLibrary, pickFromCamera, pickWithSourceChoice };
}
