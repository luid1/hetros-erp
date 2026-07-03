import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '../auth';
import { CORES } from '../config';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!email || !senha) { Alert.alert('Preencha e-mail e senha'); return; }
    setLoading(true);
    try {
      await login(email.trim(), senha);
    } catch (e) {
      Alert.alert('Não entrou', e?.response?.data?.message || 'Verifique e-mail/senha ou a conexão com o servidor.');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrap}>
      <View style={s.card}>
        <Text style={s.logo}>HETROS</Text>
        <Text style={s.sub}>Compradores · Cotações & Ordens de Compra</Text>

        <Text style={s.label}>E-mail</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          placeholder="voce@hetros.com.br" placeholderTextColor={CORES.fraco} style={s.input} />

        <Text style={s.label}>Senha</Text>
        <TextInput value={senha} onChangeText={setSenha} secureTextEntry placeholder="••••••••"
          placeholderTextColor={CORES.fraco} style={s.input} onSubmitEditing={entrar} />

        <Pressable onPress={entrar} disabled={loading} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
          {loading ? <ActivityIndicator color="#0B0F17" /> : <Text style={s.btnTxt}>Entrar</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: CORES.bg, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: CORES.card2, borderColor: CORES.borda, borderWidth: 1, borderRadius: 20, padding: 22 },
  logo: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  sub: { color: CORES.sub, textAlign: 'center', marginTop: 4, marginBottom: 18, fontSize: 12 },
  label: { color: CORES.sub, fontSize: 11, fontWeight: '700', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: CORES.card, borderColor: CORES.borda, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: CORES.texto, fontSize: 16 },
  btn: { backgroundColor: CORES.amber, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  btnTxt: { color: '#0B0F17', fontWeight: '800', fontSize: 16 },
});
