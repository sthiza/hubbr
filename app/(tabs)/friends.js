// app/(tabs)/friends.js
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { api } from "../../lib/api";
import { useRouter } from "expo-router";

export const tabBarLabel = "Friends";

export default function FriendsTab() {
  const [rows, setRows] = useState([]);
  const router = useRouter();

  async function load() {
    try {
      const r = await api("/messages/inbox");
      if (!r.ok) throw new Error();
      const data = await r.json();
      const items = (Array.isArray(data) ? data : []).map((it, i) => ({
        id: String(it.thread_id || it.user_id || i),
        username: it.other_username || it.username || it.peer_username || "unknown",
        last_message: it.last_message || "",
      }));
      setRows(items);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={S.container}>
      <Text style={S.title}>Friends / Inbox</Text>
      <FlatList
        data={rows}
        keyExtractor={(it) => it.id}
        ListEmptyComponent={<Text style={S.empty}>No conversations yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={S.item} onPress={() => router.push({ pathname: "/chat/[username]", params: { username: item.username } })}>
            <Text style={S.name}>{item.username}</Text>
            <Text numberOfLines={1} style={S.preview}>{item.last_message || " "}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  empty: { textAlign: "center", color: "#888", marginTop: 24 },
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#eee" },
  name: { fontSize: 16, fontWeight: "600" },
  preview: { color: "#666", marginTop: 4 },
});
