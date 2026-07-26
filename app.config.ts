import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "HouseParty",
  slug: "houseparty",
  owner: "nippsss7",
  scheme: "houseparty",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    // Unique to this developer account — "com.houseparty.app" is already
    // registered to another Apple team and can never be used by this app.
    bundleIdentifier: "com.nippunsingla.houseparty",
    // Personal (free) Apple ID team for device dev builds; replace with the
    // paid Apple Developer team before TestFlight/App Store distribution.
    appleTeamId: "BPAL2Q35S8",
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "HouseParty uses your location to show nearby events and parties on the map.",
    },
  },
  android: {
    package: "com.nippunsingla.houseparty",
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
    "./plugins/withoutPushEntitlement",
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
