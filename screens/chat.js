import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import socket from "../lib/socket";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [recipientId, setRecipientId] = useState(null);
  const [recipientUsername, setRecipientUsername] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const sendMessage = () => {
    if (!messageInput.trim() || !recipientId) {
      console.warn("❌ Cannot send message: Missing input or recipient");
      return;
    }

    const newMessage = {
      id: Date.now(),
      sender_id: userId,
      recipient_id: recipientId,
      content: messageInput,
      created_at: new Date().toISOString(),
    };

    console.log("🚀 Sending message:", newMessage);

    socket.emit("send_message", {
      message: newMessage,
      recipientId,
      senderId: userId,
    });

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");
  };

  useEffect(() => {
    const initialize = async () => {
      const storedId = await AsyncStorage.getItem("userId");
      const storedRecipientId = await AsyncStorage.getItem("recipientId");
      const storedRecipientUsername = await AsyncStorage.getItem("recipientUsername");

      console.log("📦 Stored userId:", storedId);
      console.log("📦 Stored recipientId:", storedRecipientId);
      console.log("📦 Username:", storedRecipientUsername);

      if (storedId) setUserId(Number(storedId));
      if (storedRecipientId) setRecipientId(Number(storedRecipientId));
      if (storedRecipientUsername) setRecipientUsername(storedRecipientUsername);

      socket.emit("join", { userId: storedId });

      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
      });

      socket.on("connect_error", (err) => {
        console.error("❌ Socket connection failed:", err.message);
      });

      socket.on("receive_message", (message) => {
        console.log("📥 Message received:", message);
        setMessages((prev) => [...prev, message]);
      });

      return () => {
        socket.off("receive_message");
        socket.disconnect();
      };
    };

    initialize();
  }, []);

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender_id === userId ? styles.sent : styles.received,
      ]}
    >
      <Text style={styles.messageText}>{item.content}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      {/* ✅ Username Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>{recipientUsername || "Chat"}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.messages}
      />

      {/* 🔧 TEMP TEST BUTTON */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={async () => {
          await AsyncStorage.setItem("userId", "3");
          await AsyncStorage.setItem("recipientId", "6");
          await AsyncStorage.setItem("recipientUsername", "newuser123");

          const storedId = await AsyncStorage.getItem("userId");
          const storedRecipientId = await AsyncStorage.getItem("recipientId");
          const storedUsername = await AsyncStorage.getItem("recipientUsername");

          console.log("✅ Test IDs set:", storedId, storedRecipientId, storedUsername);

          if (storedId) setUserId(Number(storedId));
          if (storedRecipientId) setRecipientId(Number(storedRecipientId));
          if (storedUsername) setRecipientUsername(storedUsername);

          socket.emit("join", { userId: storedId });
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          🔧 Set Test User IDs
        </Text>
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageInput}
          onChangeText={setMessageInput}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={{ color: "white", fontWeight: "bold" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: "#000",
    alignItems: "center",
  },
  headerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  messages: { padding: 16 },
  messageBubble: {
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
    maxWidth: "80%",
  },
  sent: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
  },
  received: {
    backgroundColor: "#E5E5EA",
    alignSelf: "flex-start",
  },
  messageText: { fontSize: 16 },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fafafa",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#000",
    borderRadius: 25,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  debugButton: {
    backgroundColor: "orange",
    marginHorizontal: 20,
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: "center",
  },
});
