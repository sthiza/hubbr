import React, { useEffect, useState } from "react";
import { View, Text, Switch, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, API_BASE } from "../../lib/api";

const PATH_GETS = ["/users/me", "/users/profile", "/auth/me"];
const PATH_PATCH = ["/users/settings", "/users/me", "/users/profile"];

export default function SettingsScreen() {
  const [ghostMode, setGhostMode] = useState(false);
  const [hideLastSeen, setHideLastSeen] = useState(false);
  const [hideTyping, setHideTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let me = null;

        // 1) Try API routes
        for (const path of PATH_GETS) {
          try {
            console.log(`[settings] GET ${API_BASE}${path}`);
            const res = await api(path);
            if (!res.ok) continue;
            me = await res.json();
            break;
          } catch (_) {}
        }

        // 2) Fallback to locally cached user/settings
        if (!me) {
          const cachedUser = await AsyncStorage.getItem("user");
          if (cachedUser) me = JSON.parse(cachedUser);
        }
        const cachedSettings = await AsyncStorage.getItem("settings.local");
        const local = cachedSettings ? JSON.parse(cachedSettings) : {};

        if (!me && !cachedSettings) throw new Error("Unable to fetch settings");

        setGhostMode(!!(me?.ghost_mode ?? local.ghost_mode));
        setHideLastSeen(!!(me?.hide_last_seen ?? local.hide_last_seen));
        setHideTyping(!!(me?.hide_typing ?? local.hide_typing));
      } catch (e) {
        console.warn("Fetch settings failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistLocal = async (changes) => {
    const current = await AsyncStorage.getItem("settings.local");
    const merged = { ...(current ? JSON.parse(current) : {}), ...changes };
    await AsyncStorage.setItem("settings.local", JSON.stringify(merged));
  };

  const updateSettings = async (changes) => {
    // Try API PATCH first
    for (const path of PATH_PATCH) {
      try {
        const res = await api(path, { method: "PATCH", body: JSON.stringify(changes) });
        if (res.ok) return true;
      } catch (_) {}
    }
    // Fallback: store locally so UI stays consistent
    await persistLocal(changes);
    Alert.alert("Saved locally", "Settings will sync when the server endpoint exists.");
    return false;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privacy</Text>

      <Row
        label="Ghost Mode"
        value={ghostMode}
        onValueChange={async (v) => { setGhostMode(v); await updateSettings({ ghost_mode: v }); }}
        disabled={loading}
      />

      <Row
        label="Hide Last Seen"
        value={hideLastSeen}
        onValueChange={async (v) => { setHideLastSeen(v); await updateSettings({ hide_last_seen: v }); }}
        disabled={loading}
      />

      <Row
        label="Hide Typing"
        value={hideTyping}
        onValueChange={async (v) => { setHideTyping(v); await updateSettings({ hide_typing: v }); }}
        disabled={loading}
      />
    </View>
  );
}

function Row({ label, value, onValueChange, disabled }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  label: { fontSize: 16 },
});
