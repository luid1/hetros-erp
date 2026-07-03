import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useAuth } from '../auth';
import { CORES } from '../config';

const R$ = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS = {
  PENDENTE: { l: 'Pendente', c: CORES.amber },
  APROVADA: { l: 'Aprovada', c: CORES.sky },
  PARCIAL: { l: 'Parcial', c: '#A78BFA' },
  ENTREGUE: { l: 'Entregue', c: CORES.verde },
  CANCELADA: { l: 'Cancelada', c: CORES.vermelho },
};

export default function MinhasOCsScreen() {
  const { usuario } = useAuth();
  const [ocs, setOcs] = useState([]);
  const [loading, setLoading] = useState(false);
  // Pode aprovar quem tem a tela de compras (ex.: líder/Leide). ADMIN sempre pode.
  const podeAprovar = usuario?.role === 'ADMIN' || (usuario?.telas || []).some(t => t === '*' || String(t).includes('compras'));

  const carregar = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/compras'); setOcs(Array.isArray(data) ? data : []); } catch { setOcs([]); }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function aprovar(oc) {
    try { await api.patch(`/compras/${oc.id}/status`, { status: 'APROVADA' }); carregar(); }
    catch (e) { Alert.alert('Erro', e?.response?.data?.message || 'Não consegui aprovar.'); }
  }

  return (
    <View style={s.wrap}>
      <FlatList
        data={ocs}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} tintColor={CORES.amber} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        ListHeaderComponent={<Text style={s.titulo}>Ordens de Compra</Text>}
        ListEmptyComponent={<Text style={s.vazio}>{loading ? 'Carregando...' : 'Nenhuma OC. Crie na aba "Nova OC".'}</Text>}
        renderItem={({ item }) => {
          const st = STATUS[item.status] || { l: item.status, c: CORES.sub };
          return (
            <View style={s.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.num}>OC #{item.numero}</Text>
                <View style={[s.badge, { backgroundColor: st.c + '22', borderColor: st.c + '55' }]}><Text style={[s.badgeTxt, { color: st.c }]}>{st.l}</Text></View>
              </View>
              <Text style={s.forn}>{item.fornecedor?.nomeFantasia || item.fornecedor?.razaoSocial || '—'}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={s.sub}>{item._count?.itens ?? item.itens?.length ?? 0} item(ns)</Text>
                <Text style={s.total}>{R$(item.valorTotal)}</Text>
              </View>
              {item.status === 'PENDENTE' && podeAprovar && (
                <Pressable onPress={() => aprovar(item)} style={s.aprovar}><Text style={s.aprovarTxt}>Aprovar OC</Text></Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: CORES.bg },
  titulo: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10, paddingHorizontal: 4 },
  card: { backgroundColor: CORES.card, borderColor: CORES.borda, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  num: { color: '#fff', fontSize: 16, fontWeight: '800' },
  forn: { color: CORES.texto, marginTop: 4, fontWeight: '600' },
  sub: { color: CORES.sub, fontSize: 12 },
  total: { color: CORES.verde, fontWeight: '800', fontSize: 16 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  aprovar: { backgroundColor: CORES.sky, borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  aprovarTxt: { color: '#0B0F17', fontWeight: '800' },
  vazio: { color: CORES.sub, textAlign: 'center', marginTop: 40 },
});
