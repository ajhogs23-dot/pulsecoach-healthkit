// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "com.app.pulsecoach";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "VELTURA",
  appSlug: "pulsecoach",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "/manus-storage/pulsecoach-icon_9afdcb98.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/4821b84a-1a07-49de-b561-8acd1159021f",
  },
  extra: {
    eas: {
      projectId: "4821b84a-1a07-49de-b561-8acd1159021f",
    },
  },
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSHealthShareUsageDescription": "VELTURA reads steps, active energy, distance, heart rate, and workouts to personalize your coaching.",
        "NSHealthUpdateUsageDescription": "VELTURA can save completed workouts and activity summaries when you choose.",
        "NSSpeechRecognitionUsageDescription": "VELTURA uses speech recognition to understand hands-free workout commands.",
        "NSLocationWhenInUseUsageDescription": "VELTURA uses your location while an activity is active to draw your route.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "VELTURA uses background location only when you enable an active activity session, so route tracking can continue with the screen locked.",
        "NSMotionUsageDescription": "VELTURA uses motion data to help identify activity and movement periods.",
        "NSPhotoLibraryUsageDescription": "VELTURA accesses your photo library only when you choose a photo to add to your profile or fitness records.",
        "UIBackgroundModes": ["location"]
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-asset",
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location while recording a walk, run, or ride.",
        locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to continue recording an active route when the screen is locked.",
        isIosBackgroundLocationEnabled: true,
      },
    ],
    ["@kingstinct/react-native-healthkit", {
      NSHealthShareUsageDescription: "VELTURA reads the health categories you approve to show accurate movement and recovery summaries.",
      NSHealthUpdateUsageDescription: "VELTURA does not write health records to Apple Health.",
      background: true,
    }],
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to identify workout equipment and guide your setup.",
        microphonePermission: "Allow $(PRODUCT_NAME) to use your microphone for hands-free coaching.",
      },
    ],
    [
      "expo-speech-recognition",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to listen for hands-free coaching commands.",
        speechRecognitionPermission: "Allow $(PRODUCT_NAME) to convert your spoken coaching prompts into text.",
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
