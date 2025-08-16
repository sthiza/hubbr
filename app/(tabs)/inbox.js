// C:\Users\User\hubrr_mobile\app\(tabs)\inbox.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

// Prefer the VPS; change to your LAN IP if you're testing locally.
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || "https://api.hubrr.com/api").replace(/\/$/, "");

async function getToken() {
  return AsyncStorage.getItem("token");
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString();
}

export default function InboxScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchThreads = useCallback(async () => {
    setError("");
    try {
      const token = await getToken();
      if (!token) {
        setError("Not logged in.");
        setThreads([]);
        return;
      }
      const res = await fetch(`${API_BASE}/messages/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const data = await res.json();
      // API returns [{ user_id, other_username, last_message, updated_at }]
      setThreads(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load inbox.");
      setThreads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchThreads();
  }, [fetchThreads]);

  const openThread = (username) => {
    router.push({ pathname: "/chat/[username]", params: { username: String(username).trim() } });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={styles.dim}>Loading inbox…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={threads}
        keyExtractor={(item, i) => String(item.user_id ?? i)}
        renderItem={({ item }) => {
          const username = item.other_username || item.username || "unknown";
          return (
            <TouchableOpacity style={styles.thread} onPress={() => openThread(username)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{username.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.meta}>
                <View style={styles.topLine}>
                  <Text numberOfLines={1} style={styles.username}>{username}</Text>
                  <Text style={styles.time}>{formatTime(item.updated_at || item.created_at)}</Text>
                </View>
                <Text numberOfLines={1} style={styles.preview}>{item.last_message || "No messages yet"}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No conversations yet.</Text>}
        contentContainerStyle={threads.length === 0 ? { flex: 1, justifyContent: "center" } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },
  thread: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#eee" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#111827", alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { color: "#fff", fontWeight: "700" },
  meta: { flex: 1 },
  topLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  username: { fontSize: 16, fontWeight: "700", maxWidth: "70%" },
  time: { fontSize: 12, color: "#6b7280" },
  preview: { fontSize: 14, color: "#4b5563", marginTop: 2 },
  error: { color: "#b91c1c", padding: 12, textAlign: "center" },
  empty: { textAlign: "center", color: "#888" },
  dim: { color: "#6b7280" },
});
