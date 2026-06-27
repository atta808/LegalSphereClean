module.exports = ({ config }) => {
  return {
    ...config,
    name: "LegalSphereUltimate",
    slug: "legalsphereultimate",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "cover",
      backgroundColor: "#1E3A8A"
    },
    android: {
      package: "com.technaam.legalsphereultimate",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO"
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1E3A8A"
      }
    },
    plugins: [
      "expo-sqlite",
      "expo-image-picker",
      "expo-media-library",
      "@react-native-community/datetimepicker",
      "expo-sharing",
      "expo-font"
    ],
    extra: {
      eas: {
        projectId: "9eb963e3-d078-4177-bb97-1c3e387d8184"
      },
      googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY || null
    }
  };
};
