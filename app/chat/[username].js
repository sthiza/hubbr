// app/chat/[username].js  (Expo Router / React Native)
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, FlatList, StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../lib/api";
import { ensureKeys, encryptForUser, decryptIfPossible } from "../../lib/e2ee";


// Use VPS by default. If testing local LAN, change to http://YOUR_LAN_IP:4000/api
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || "https://api.hubrr.com/api").replace(/\/$/, "");

export default function ThreadScreen() {
  const { username } = useLocalSearchParams();      // comes from /chat/[username]
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
  }, []);

  const fetchThread = useCallback(async () => {
    setError("");
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { setError("Not logged in."); setLoading(false); return; }

      // ✅ our backend expects username here
      const res = await fetch(`${API_BASE}/messages/thread/${encodeURIComponent(username)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const data = await res.json();
      setOtherUser(data?.other_user ?? { username: String(username) });
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      setError(e?.message || "Failed to load thread.");
      setMessages([]);
    } finally {
      setLoading(false);
      setTimeout(scrollToEnd, 100);
    }
  }, [username, scrollToEnd]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  const mySide = useCallback(
    (m) => (otherUser ? m.sender_id !== otherUser.id : false),
    [otherUser]
  );

  const send = useCallback(async () => {
    const content = (input || "").trim();
    if (!content) return;
    setSending(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Not logged in.");

      // ✅ our backend accepts recipientUsername (case-insensitive)
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, recipientUsername: String(username) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const data = await res.json();
      const msg = data?.message;

      setMessages((prev) => [
        ...prev,
        msg || {
          id: Date.now(),
          sender_id: otherUser ? (otherUser.id + 999999) : 999999, // optimistic "me"
          recipient_id: otherUser?.id,
          content,
          created_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          read_at: null,
        },
      ]);
      setInput("");
      setTimeout(scrollToEnd, 60);
    } catch (e) {
      setError(e?.message || "Failed to send.");
    } finally {
      setSending(false);
    }
  }, [input, username, otherUser, scrollToEnd]);

  const renderItem = useCallback(({ item }) => {
    const mine = mySide(item);
    return (
      <View style={[styles.row, mine ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.msgText, mine ? styles.msgMine : styles.msgTheirs]}>{item.content}</Text>
          <Text style={styles.time}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  }, [mySide]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.dim}>Loading chat…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backTxt}>‹</Text></Pressable>
        <Text numberOfLines={1} style={styles.title}>{otherUser?.username || String(username)}</Text>
        <View style={{ width: 32 }} />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, idx) => String(item?.id ?? idx)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
        onContentSizeChange={scrollToEnd}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          style={styles.input}
          multiline
        />
        <Pressable onPress={send} disabled={sending || !input.trim()} style={styles.sendBtn}>
          {sending ? <ActivityIndicator /> : <Text style={styles.sendTxt}>Send</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },
  dim: { color: "#6b7280" },
  header: {
    height: 52, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb",
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  backTxt: { fontSize: 22, fontWeight: "700" },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700" },

  row: { flexDirection: "row", marginBottom: 8, maxWidth: "85%" },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { marginLeft: "15%", alignSelf: "flex-end", justifyContent: "flex-end" },

  bubble: { padding: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  bubbleTheirs: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
  bubbleMine: { backgroundColor: "#111827", borderColor: "#111827" },

  msgText: { fontSize: 15, lineHeight: 20 },
  msgTheirs: { color: "#111827" },
  msgMine: { color: "#fff" },
  time: { fontSize: 11, color: "#6b7280", alignSelf: "flex-end" },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", gap: 8,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb", borderRadius: 12, fontSize: 15,
  },
  sendBtn: { height: 40, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#111827" },
  sendTxt: { color: "#fff", fontWeight: "700" },
});
