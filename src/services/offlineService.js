import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveOffline = async (key, data) => {
  try {
    const existing = await AsyncStorage.getItem(key);
    const parsed = existing ? JSON.parse(existing) : [];

    parsed.push(data);

    await AsyncStorage.setItem(key, JSON.stringify(parsed));
  } catch (error) {
    console.log("Offline Save Error:", error);
  }
};

export const getOffline = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.log("Offline Read Error:", error);
    return [];
  }
};

export const clearOffline = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.log("Offline Clear Error:", error);
  }
};
