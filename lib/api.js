// C:\Users\User\hubrr_mobile\lib\api.js
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE =
  (Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_BASE ||
    process.env.EXPO_PUBLIC_API_BASE ||
    "https://api.hubrr.com/api").replace(/\/$/, "");

// ✅ put the log OUTSIDE the fetch options
console.log("[API_BASE]", API_BASE);

export async function api(path, options = {}) {
  const token = await AsyncStorage.getItem("token");
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}
