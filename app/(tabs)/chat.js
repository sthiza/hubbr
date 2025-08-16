import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

const socket = io("http://192.168.1.96:4000", { transports: ["websocket"] });

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const flatListRef = useRef();
  const insets = useSafeAreaInsets();

  const sendMessage = async () => {
    if (!messageInput.trim()) return;
    const userId = await AsyncStorage.getItem("userId");
    const message = {
      id: Date.now(),
      sender_id: Number(userId),
      recipient_id: Number(userId), // self test
      content: messageInput.trim(),
      created_at: new Date().toISOString(),
    };
    socket.emit("send_message", { message, senderId: userId, recipientId: userId });
    setMessages((prev) => [...prev, message]);
    setMessageInput('');
  };

  const handleTyping = async () => {
    const senderId = await AsyncStorage.getItem("userId");
    socket.emit("typing", { senderId, recipientId: senderId });
  };

  useEffect(() => {
    (async () => {
      const userId = await AsyncStorage.getItem("userId");
      socket.emit("join", { userId });
    })();

    socket.on("receive_message", (message) => {
      setMessages((prev) => [...prev, message]);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    socket.on("user_typing", ({ senderId }) => {
      setTypingUser(senderId);
      setTimeout(() => setTypingUser(null), 1500);
    });

    return () => {
      socket.off("receive_message");
      socket.off("user_typing");
    };
  }, []);

  return (
    <SafeAreaView style={styles.wrap}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.bottom + 60} // space over tab bar
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.messageBubble, styles.sent]}>
              <Text style={styles.messageText}>{item.content}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
        />
        {typingUser && <Text style={[styles.typingIndicator, { marginBottom: 4 }]}>💬 Typing…</Text>}

        <View style={[styles.inputRow, { paddingBottom: insets.bottom || 8 }]}>
          <TextInput
            style={styles.input}
            value={messageInput}
            onChangeText={(t) => { setMessageInput(t); handleTyping(); }}
            onSubmitEditing={sendMessage}
            placeholder="Type a message"
            returnKeyType="send"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
  messageBubble: { padding: 10, borderRadius: 16, marginVertical: 4, maxWidth: "80%" },
  sent: { backgroundColor: "#000", alignSelf: "flex-end" },
  messageText: { color: "#fff", fontSize: 16, lineHeight: 20 },
  typingIndicator: { alignSelf: 'flex-start', color: '#555', paddingHorizontal: 12 },
  inputRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
});
