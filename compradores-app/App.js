import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, ActivityIndicator, Text, Pressable, StyleSheet, BackHandler, Platform, RefreshControl, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────────────────────
// Casca WebView: o app de verdade é o AppComprador (web) servido pelo frontend.
// Assim o APK fica SEMPRE igual ao app web — nada de manter dois códigos.
// Configure a URL em app.json > expo.extra.webUrl (+ appPath da tela cheia).
// ─────────────────────────────────────────────────────────────────────────────
const extra = (Constants.expoConfig && Constants.expoConfig.extra) || {};
const WEB_URL = (extra.webUrl || 'http://localhost:3000').replace(/\/$/, '');
const APP_PATH = extra.appPath || '/app/comprador';
const URL_INICIAL = WEB_URL + APP_PATH;

const CORES = { bg: '#F7F5F1', azul: '#2563EB', texto: '#0B0F17', sub: '#64748B' };

export default function App() {
  const webRef = useRef(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [podeVoltar, setPodeVoltar] = useState(false);
  const [key, setKey] = useState(0); // forçar remontagem no "tentar de novo"

  // Botão físico "voltar" do Android navega dentro do site em vez de fechar o app.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (podeVoltar && webRef.current) { webRef.current.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [podeVoltar]);

  const recarregar = useCallback(() => {
    setErro(false);
    setCarregando(true);
    setKey((k) => k + 1);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <StatusBar style="dark" backgroundColor={CORES.bg} />

        {erro ? (
          <ScrollView
            contentContainerStyle={s.centro}
            refreshControl={<RefreshControl refreshing={false} onRefresh={recarregar} />}
          >
            <Text style={s.emoji}>📡</Text>
            <Text style={s.titulo}>Sem conexão</Text>
            <Text style={s.msg}>Não consegui abrir o app. Verifique a internet e tente de novo.</Text>
            <Pressable onPress={recarregar} style={s.botao}>
              <Text style={s.botaoTxt}>Tentar de novo</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <WebView
              key={key}
              ref={webRef}
              source={{ uri: URL_INICIAL }}
              originWhitelist={['*']}
              // Mantém sessão (localStorage/cookies) entre aberturas — não pede login toda hora.
              domStorageEnabled
              javaScriptEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              cacheEnabled
              pullToRefreshEnabled
              startInLoadingState
              onLoadStart={() => setCarregando(true)}
              onLoadEnd={() => setCarregando(false)}
              onNavigationStateChange={(nav) => setPodeVoltar(nav.canGoBack)}
              onError={() => { setErro(true); setCarregando(false); }}
              onHttpError={(e) => {
                const code = e?.nativeEvent?.statusCode;
                if (code && code >= 500) { setErro(true); setCarregando(false); }
              }}
              style={{ flex: 1, backgroundColor: CORES.bg }}
            />
            {carregando && (
              <View style={s.overlay} pointerEvents="none">
                <ActivityIndicator size="large" color={CORES.azul} />
                <Text style={s.carregandoTxt}>Carregando…</Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CORES.bg },
  centro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 44, marginBottom: 12 },
  titulo: { fontSize: 20, fontWeight: '800', color: CORES.texto, marginBottom: 6 },
  msg: { fontSize: 14, color: CORES.sub, textAlign: 'center', marginBottom: 22 },
  botao: { backgroundColor: CORES.azul, borderRadius: 12, paddingHorizontal: 26, paddingVertical: 13 },
  botaoTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: CORES.bg },
  carregandoTxt: { marginTop: 10, color: CORES.sub, fontSize: 13, fontWeight: '600' },
});
