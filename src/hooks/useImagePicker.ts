import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import { Alert } from "react-native";

async function pickFrom(source: "library" | "camera") {
  try {
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
  } catch (err) {
    // Resolve to null rather than reject — pickWithSourceChoice's Promise
    // executor only wires up `resolve`, so an uncaught rejection here would
    // leave that promise (and any awaiting caller) hanging forever.
    console.error(`Failed to pick image from ${source}:`, err);
    Alert.alert("Couldn't open " + (source === "library" ? "photo library" : "camera"), "Please try again.");
    return null;
  }
}

async function pickMultiple(maxCount: number) {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access in Settings to continue.");
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: maxCount,
    });
    if (result.canceled) return [];
    return result.assets.map((asset) => asset.uri);
  } catch (err) {
    console.error("Failed to pick images from library:", err);
    Alert.alert("Couldn't open photo library", "Please try again.");
    return [];
  }
}

export function useImagePicker() {
  const pickFromLibrary = useCallback(() => pickFrom("library"), []);
  const pickFromCamera = useCallback(() => pickFrom("camera"), []);
  const pickMultipleFromLibrary = useCallback((maxCount: number) => pickMultiple(maxCount), []);

  const pickWithSourceChoice = useCallback(() => {
    return new Promise<string | null>((resolve) => {
      Alert.alert("Add photo", "Choose a source", [
        { text: "Camera", onPress: () => pickFrom("camera").then(resolve) },
        { text: "Photo Library", onPress: () => pickFrom("library").then(resolve) },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ]);
    });
  }, []);

  return { pickFromLibrary, pickFromCamera, pickWithSourceChoice, pickMultipleFromLibrary };
}
