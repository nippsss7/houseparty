import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "HouseParty",
  slug: "houseparty",
  scheme: "houseparty",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.houseparty.app",
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "HouseParty uses your location to show nearby events and parties on the map.",
    },
  },
  android: {
    package: "com.houseparty.app",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "@react-native-community/datetimepicker",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "HouseParty uses your location to show nearby events and parties on the map.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "HouseParty needs access to your photos to upload event pictures and your ID for verification.",
        cameraPermission:
          "HouseParty needs camera access to take photos for events and identity verification.",
      },
    ],
    [
      "@rnmapbox/maps",
      {
        RNMapboxMapsVersion: "11.20.1",
        // The secret download token itself is read from the RNMAPBOX_MAPS_DOWNLOAD_TOKEN
        // env var directly (see .env) — the config-plugin option of the same name is deprecated.
      },
    ],
    "./plugins/withDisableUserScriptSandboxing",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
