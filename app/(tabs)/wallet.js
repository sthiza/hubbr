import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { DEBUG_BASE } from '../../src/api/client';
import * as WALLET from '../../src/api/wallet'; // wildcard import avoids stale named-import issues

const SHOW_API = String(process.env.EXPO_PUBLIC_SHOW_API_BANNER || '0') === '1';

const Btn = ({ title, onPress, style }) => (
  <TouchableOpacity onPress={onPress} style={[styles.btn, style]}>
    <Text style={styles.btnLabel}>{title}</Text>
  </TouchableOpacity>
);

export default function WalletScreen() {
  const [balance, setBalance] = useState(0);
  const [topupAmt, setTopupAmt] = useState('');
  const [to, setTo] = useState('');
  const [sendAmt, setSendAmt] = useState('');

  const load = async () => {
    try {
      // prove the module that Metro loaded is the one we just wrote
      if (WALLET.__ping !== 'wallet-js-loaded' || typeof WALLET.getBalance !== 'function') {
        console.log('WALLET_KEYS', Object.keys(WALLET || {}));
        throw new Error('wallet API not loaded');
      }
      const data = await WALLET.getBalance();
      setBalance(Number(data?.balance ?? 0));
    } catch (e) {
      Alert.alert('Balance error', e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const doTopup = async () => {
    const amt = Number(topupAmt);
    if (!amt || amt <= 0) return Alert.alert('Invalid amount', 'Enter a positive number.');
    try {
      await WALLET.topup(amt);
      setTopupAmt('');
      await load();
    } catch (e) {
      Alert.alert('Top-up failed', e.message);
    }
  };

  const doSend = async () => {
    const amt = Number(sendAmt);
    if (!to || !amt || amt <= 0) return Alert.alert('Invalid input', 'Enter recipient and a positive amount.');
    try {
      await WALLET.send(to, amt);
      setSendAmt('');
      await load();
    } catch (e) {
      Alert.alert('Send failed', e.message);
    }
  };

  return (
    <View style={styles.container}>
      {SHOW_API && <Text style={styles.apiBanner}>API = {DEBUG_BASE}/</Text>}

      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.balance}>
        Balance: <Text style={styles.balanceNum}>{balance}</Text> ZAR
      </Text>

      <View style={styles.card}>
        <Text style={styles.section}>Top up</Text>
        <TextInput
          style={styles.input}
          placeholder="Amount"
          keyboardType="numeric"
          value={topupAmt}
          onChangeText={setTopupAmt}
        />
        <Btn title="TOP UP" onPress={doTopup} />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Send</Text>
        <TextInput
          style={styles.input}
          placeholder="Recipient (e.g., user:42)"
          value={to}
          onChangeText={setTo}
        />
        <TextInput
          style={styles.input}
          placeholder="Amount"
          keyboardType="numeric"
          value={sendAmt}
          onChangeText={setSendAmt}
        />
        <Btn title="SEND" onPress={doSend} />
      </View>

      <Btn title="REFRESH BALANCE" onPress={load} style={{ marginTop: 16 }} />
    </View>
  );
}

const COLORS = {
  primary: '#1E88E5',
  text: '#0f172a',
  border: '#e5e7eb',
  bg: '#ffffff',
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.bg },
  apiBanner: { textAlign: 'center', opacity: 0.6, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginVertical: 8, color: COLORS.text },
  balance: { fontSize: 22, textAlign: 'center', marginBottom: 16, color: COLORS.text },
  balanceNum: { fontWeight: '900', color: COLORS.text },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 16, marginBottom: 16 },
  section: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: COLORS.text },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 12 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
