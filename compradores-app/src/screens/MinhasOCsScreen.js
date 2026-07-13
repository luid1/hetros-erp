import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, StyleSheet, Alert, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useAuth } from '../auth';
import { CORES } from '../config';

const R$ = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CONDICAO = { A_VISTA: 'À vista', '30_DIAS': '30 dias', '30_60': '30/60 dias', '30_60_90': '30/60/90 dias' };

// Monta o texto do pedido pra enviar no WhatsApp (Share nativo).
function textoPedido(oc) {
  const forn = oc.fornecedor?.nomeFantasia || oc.fornecedor?.razaoSocial || '—';
  const itens = (oc.itens || []).map((i) => {
    const q = Number(i.quantidade) || 0, p = Number(i.precoUnitario) || 0;
    return `• ${i.descricao || i.produto?.descricao || '—'} — ${q} ${i.unidade || ''} × ${R$(p)} = ${R$(q * p)}`;
  }).join('\n');
  const cond = oc.condicaoPagamento ? `\nPagamento: ${CONDICAO[oc.condicaoPagamento] || oc.condicaoPagamento}` : '';
  return `*PEDIDO DE COMPRA — HETROS*\nOC #${oc.numero}\nFornecedor: ${forn}\n\n${itens || '(sem itens)'}\n\n*Total: ${R$(oc.valorTotal)}*${cond}`;
}
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

  async function compartilhar(oc) {
    // Busca o detalhe (com itens) pra montar o texto; se offline, usa o resumo da lista.
    let full = oc;
    try { const { data } = await api.get(`/compras/${oc.id}`); full = data; } catch {}
    try { await Share.share({ message: textoPedido(full) }); }
    catch (e) { Alert.alert('Erro', 'Não consegui abrir o compartilhamento.'); }
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
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable onPress={() => compartilhar(item)} style={s.whats}><Text style={s.whatsTxt}>📲 Enviar no WhatsApp</Text></Pressable>
                {item.status === 'PENDENTE' && podeAprovar && (
                  <Pressable onPress={() => aprovar(item)} style={[s.aprovar, { flex: 1, marginTop: 0 }]}><Text style={s.aprovarTxt}>Aprovar OC</Text></Pressable>
                )}
              </View>
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
  whats: { flex: 1, backgroundColor: '#25D36622', borderColor: '#25D36688', borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  whatsTxt: { color: '#25D366', fontWeight: '800' },
  vazio: { color: CORES.sub, textAlign: 'center', marginTop: 40 },
});
