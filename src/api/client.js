// src/api/client.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = (process.env.EXPO_PUBLIC_API_BASE ?? 'https://api.hubrr.com/api').replace(/\/+$/, '');

export const apiUrl = (path) => `${BASE}/${String(path).replace(/^\/+/, '')}`;

export const jsonFetch = async (path, options = {}) => {
  const token = await AsyncStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(apiUrl(path), { ...options, headers });
  const text = await res.text();

  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || data?.raw || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};
