import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth';
import { getComCache } from '../api';
import { CORES } from '../config';

const R$ = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CotacoesScreen() {
  const { filial } = useAuth();
  const [itens, setItens] = useState([]);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    if (!filial) return;
    setLoading(true);
    try {
      const { data, offline } = await getComCache(`/custos/${filial.id}/cotacoes`, `cotacoes_${filial.id}`);
      setItens(Array.isArray(data) ? data : []);
      setOffline(offline);
    } catch { setItens([]); }
    setLoading(false);
  }, [filial]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const filtrados = busca ? itens.filter(i => (i.descricao || '').toLowerCase().includes(busca.toLowerCase())) : itens;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.titulo}>Cotações do dia</Text>
        <Text style={s.sub}>{filial?.nome || ''}{offline ? '  ·  offline (últimos preços)' : ''}</Text>
      </View>
      <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar produto..." placeholderTextColor={CORES.fraco} style={s.busca} />
      <FlatList
        data={filtrados}
        keyExtractor={(i) => i.id || i.codigo}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} tintColor={CORES.amber} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        ListEmptyComponent={<Text style={s.vazio}>{loading ? 'Carregando...' : 'Nenhuma cotação hoje. Puxe pra atualizar.'}</Text>}
        renderItem={({ item }) => (
          <View style={s.linha}>
            <View style={{ flex: 1 }}>
              <Text style={s.nome}>{item.descricao}</Text>
              <Text style={s.cod}>{item.codigo}{item.unidade ? ` · ${item.unidade}` : ''}</Text>
            </View>
            <Text style={s.preco}>{R$(item.precoVenda)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: CORES.bg },
  head: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  titulo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub: { color: CORES.sub, fontSize: 12, marginTop: 2 },
  busca: { backgroundColor: CORES.card, borderColor: CORES.borda, borderWidth: 1, borderRadius: 12, marginHorizontal: 12, marginVertical: 8, paddingHorizontal: 14, paddingVertical: 10, color: CORES.texto },
  linha: { flexDirection: 'row', alignItems: 'center', backgroundColor: CORES.card, borderColor: CORES.borda, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  nome: { color: CORES.texto, fontSize: 15, fontWeight: '700' },
  cod: { color: CORES.fraco, fontSize: 11, marginTop: 2 },
  preco: { color: CORES.verde, fontSize: 18, fontWeight: '800' },
  vazio: { color: CORES.sub, textAlign: 'center', marginTop: 40 },
});
