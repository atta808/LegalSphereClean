import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ SAVE DATA
export const saveData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.log("Save error:", error);
  }
};

// ✅ GET DATA
export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.log("Get error:", error);
    return null;
  }
};

// ✅ REMOVE DATA
export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.log("Remove error:", error);
  }
};

// ✅ CLEAR ALL DATA (important for logout/delete)
export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.log("Clear error:", error);
  }
};