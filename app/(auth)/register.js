import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jsonFetch, DEBUG_BASE } from '../../src/api/client';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const register = async () => {
    try {
      const data = await jsonFetch('auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('userId', String(data.user.id));
      await AsyncStorage.setItem('username', data.user.username);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Registration failed', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={{ textAlign:'center', opacity:0.6, marginBottom:8 }}>
        API = {DEBUG_BASE}/
      </Text>
      <Image source={require('../../assets/images/hubrr-logo.png')} style={styles.logo} />
      <Text style={styles.title}>Create an Account</Text>
      <TextInput style={styles.input} placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername}/>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail}/>
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword}/>
      <Button title="REGISTER" onPress={register} />
      <Text style={styles.or}>or</Text>
      <Button title="BACK TO LOGIN" onPress={() => router.push('/(auth)/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center', backgroundColor: '#fff' },
  logo: { width: 96, height: 96, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 10, padding: 10, borderRadius: 5 },
  or: { textAlign: 'center', marginVertical: 10 },
});
