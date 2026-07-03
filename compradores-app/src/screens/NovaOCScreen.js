import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../auth';
import { api } from '../api';
import { CORES } from '../config';

const UNIDADES = ['KG', 'UN', 'CX', 'BJ', 'PC', 'BD', 'MC', 'SC', 'DZ'];
const R$ = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v) => (v === '' || v == null ? 0 : parseFloat(String(v).replace(',', '.')) || 0);

export default function NovaOCScreen({ navigation }) {
  const { filial } = useAuth();
  const [fornecedores, setFornecedores] = useState([]);
  const [fornId, setFornId] = useState(null);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [itens, setItens] = useState([]); // { produtoId, descricao, unidade, qtd, preco }
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { api.get('/fornecedores').then(r => setFornecedores(r.data || [])).catch(() => {}); }, []);

  // Busca de produtos (debounce simples)
  useEffect(() => {
    if (!busca.trim()) { setResultados([]); return; }
    const t = setTimeout(() => {
      api.get('/produtos', { params: { q: busca } }).then(r => setResultados((r.data || []).slice(0, 20))).catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  function addProduto(p) {
    if (itens.find(i => i.produtoId === p.id)) return;
    setItens(prev => [...prev, { produtoId: p.id, descricao: p.descricao, unidade: (p.unidadeMedida?.sigla || 'KG'), qtd: '1', preco: '' }]);
    setBusca(''); setResultados([]);
  }
  const setItem = (id, patch) => setItens(prev => prev.map(i => i.produtoId === id ? { ...i, ...patch } : i));
  const removeItem = (id) => setItens(prev => prev.filter(i => i.produtoId !== id));
  const cicloUnidade = (i) => { const idx = UNIDADES.indexOf(i.unidade); setItem(i.produtoId, { unidade: UNIDADES[(idx + 1) % UNIDADES.length] }); };

  const total = itens.reduce((s, i) => s + num(i.qtd) * num(i.preco), 0);

  async function enviar() {
    if (!fornId) { Alert.alert('Escolha o fornecedor'); return; }
    if (itens.length === 0) { Alert.alert('Adicione ao menos um produto'); return; }
    setEnviando(true);
    try {
      await api.post('/compras', {
        fornecedorId: fornId,
        filialId: filial?.id || null,
        itens: itens.map(i => ({ produtoId: i.produtoId, descricao: i.descricao, unidade: i.unidade, quantidade: num(i.qtd), precoUnitario: num(i.preco) })),
      });
      Alert.alert('OC criada!', 'A ordem de compra subiu pro sistema (aguardando aprovação).', [
        { text: 'OK', onPress: () => { setItens([]); setFornId(null); navigation.navigate('Minhas OCs'); } },
      ]);
    } catch (e) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não consegui enviar a OC.');
    } finally { setEnviando(false); }
  }

  return (
    <View style={s.wrap}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={s.secao}>Fornecedor</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {fornecedores.map(f => (
            <Pressable key={f.id} onPress={() => setFornId(f.id)} style={[s.chip, fornId === f.id && s.chipOn]}>
              <Text style={[s.chipTxt, fornId === f.id && { color: '#0B0F17' }]}>{f.nomeFantasia || f.razaoSocial}</Text>
            </Pressable>
          ))}
          {fornecedores.length === 0 && <Text style={s.sub}>Nenhum fornecedor. Cadastre no sistema.</Text>}
        </ScrollView>

        <Text style={s.secao}>Adicionar produto</Text>
        <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar produto no banco..." placeholderTextColor={CORES.fraco} style={s.busca} />
        {resultados.map(p => (
          <Pressable key={p.id} onPress={() => addProduto(p)} style={s.result}>
            <Text style={s.resultNome}>{p.descricao}</Text>
            <Text style={s.resultCod}>{p.codigo} · {p.unidadeMedida?.sigla || 'UN'}  +</Text>
          </Pressable>
        ))}

        {itens.length > 0 && <Text style={s.secao}>Itens da OC ({itens.length})</Text>}
        {itens.map(i => (
          <View key={i.produtoId} style={s.item}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.itemNome}>{i.descricao}</Text>
              <Pressable onPress={() => removeItem(i.produtoId)}><Text style={{ color: CORES.vermelho, fontWeight: '800' }}>remover</Text></Pressable>
            </View>
            <View style={s.itemRow}>
              <View style={s.campo}><Text style={s.miniLabel}>Qtd</Text>
                <TextInput value={i.qtd} onChangeText={t => setItem(i.produtoId, { qtd: t })} keyboardType="numeric" style={s.miniInput} />
              </View>
              <Pressable onPress={() => cicloUnidade(i)} style={s.und}><Text style={s.miniLabel}>Un</Text><Text style={s.undTxt}>{i.unidade}</Text></Pressable>
              <View style={s.campo}><Text style={s.miniLabel}>Preço/un</Text>
                <TextInput value={i.preco} onChangeText={t => setItem(i.produtoId, { preco: t })} keyboardType="numeric" placeholder="0,00" placeholderTextColor={CORES.fraco} style={s.miniInput} />
              </View>
              <View style={s.campo}><Text style={s.miniLabel}>Subtotal</Text><Text style={s.subtotal}>{R$(num(i.qtd) * num(i.preco))}</Text></View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={s.rodape}>
        <View>
          <Text style={s.sub}>Total da OC</Text>
          <Text style={s.total}>{R$(total)}</Text>
        </View>
        <Pressable onPress={enviar} disabled={enviando} style={[s.enviar, enviando && { opacity: 0.6 }]}>
          {enviando ? <ActivityIndicator color="#0B0F17" /> : <Text style={s.enviarTxt}>Enviar OC</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: CORES.bg },
  secao: { color: CORES.amber, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  sub: { color: CORES.sub, fontSize: 12 },
  chip: { backgroundColor: CORES.card, borderColor: CORES.borda, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8 },
  chipOn: { backgroundColor: CORES.amber, borderColor: CORES.amber },
  chipTxt: { color: CORES.texto, fontWeight: '700', fontSize: 13 },
  busca: { backgroundColor: CORES.card, borderColor: CORES.borda, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: CORES.texto },
  result: { backgroundColor: CORES.card2, borderColor: CORES.borda, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  resultNome: { color: CORES.texto, fontWeight: '600', flex: 1 },
  resultCod: { color: CORES.sky, fontSize: 12, fontWeight: '700' },
  item: { backgroundColor: CORES.card, borderColor: CORES.borda, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  itemNome: { color: CORES.texto, fontWeight: '700', flex: 1, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  campo: { flex: 1 },
  miniLabel: { color: CORES.fraco, fontSize: 9, textTransform: 'uppercase', marginBottom: 3 },
  miniInput: { backgroundColor: CORES.card2, borderColor: CORES.borda, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, color: CORES.texto, textAlign: 'right' },
  und: { alignItems: 'center' },
  undTxt: { color: CORES.amber, fontWeight: '800', backgroundColor: CORES.card2, borderColor: CORES.borda, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  subtotal: { color: CORES.texto, fontWeight: '700', textAlign: 'right', paddingVertical: 8 },
  rodape: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: CORES.card2, borderTopColor: CORES.borda, borderTopWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { color: CORES.verde, fontSize: 22, fontWeight: '900' },
  enviar: { backgroundColor: CORES.amber, borderRadius: 12, paddingHorizontal: 26, paddingVertical: 14 },
  enviarTxt: { color: '#0B0F17', fontWeight: '800', fontSize: 16 },
});
