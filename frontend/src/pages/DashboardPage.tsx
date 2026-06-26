import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Package, AlertTriangle, TrendingUp, Truck,
  Receipt, DollarSign, Activity, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

const R$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface DashKPIs {
  totalProdutos: number;
  alertasValidade: number;
  pedidosPendentes: number;
  pedidosSeparacao: number;
  nfesHoje: number;
  valorFaturadoHoje: number;
  contasReceberVencer: number;
  valorReceberVencer: number;
  movimentacoesHoje: number;
}

function KPICard({ icon: Icon, label, value, sub, color, trend }: {
  icon: any; label: string; value: string; sub?: string; color: string; trend?: 'up' | 'down';
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { filialAtiva } = useAuth();
  const [kpis, setKpis] = useState<DashKPIs | null>(null);

  useEffect(() => {
    if (!filialAtiva) return;
    // Em produção: api.get(`/dashboard/kpis?filialId=${filialAtiva.id}`)
    // Dados simulados para desenvolvimento
    setKpis({
      totalProdutos: 847,
      alertasValidade: 12,
      pedidosPendentes: 34,
      pedidosSeparacao: 8,
      nfesHoje: 23,
      valorFaturadoHoje: 87450.00,
      contasReceberVencer: 15,
      valorReceberVencer: 43200.00,
      movimentacoesHoje: 156,
    });
  }, [filialAtiva]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Painel Operacional</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {filialAtiva ? `${filialAtiva.codigo} — ${filialAtiva.nome}` : 'Selecione uma filial'} ·{' '}
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Package} label="Itens em Estoque" value={String(kpis?.totalProdutos || 0)} color="bg-sky-500" />
        <KPICard
          icon={AlertTriangle}
          label="Alertas de Validade"
          value={String(kpis?.alertasValidade || 0)}
          sub="perecíveis vencendo"
          color={kpis?.alertasValidade ? 'bg-red-500' : 'bg-gray-400'}
        />
        <KPICard icon={Truck} label="Pedidos p/ Separar" value={String(kpis?.pedidosPendentes || 0)} color="bg-amber-500" />
        <KPICard icon={Activity} label="Em Separação" value={String(kpis?.pedidosSeparacao || 0)} color="bg-violet-500" />
      </div>

      {/* KPIs financeiros / fiscal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Receipt} label="NF-e Emitidas Hoje" value={String(kpis?.nfesHoje || 0)} color="bg-teal-500" />
        <KPICard icon={TrendingUp} label="Faturado Hoje" value={R$(kpis?.valorFaturadoHoje || 0)} color="bg-emerald-500" />
        <KPICard icon={DollarSign} label="A Receber (7 dias)" value={String(kpis?.contasReceberVencer || 0)} sub={R$(kpis?.valorReceberVencer || 0)} color="bg-blue-500" />
        <KPICard icon={Activity} label="Movimentações Hoje" value={String(kpis?.movimentacoesHoje || 0)} color="bg-indigo-500" />
      </div>

      {/* Alertas críticos */}
      {(kpis?.alertasValidade || 0) > 0 && (
        <div className="card border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">
                {kpis?.alertasValidade} produto{kpis?.alertasValidade !== 1 ? 's' : ''} com validade vencendo em breve
              </p>
              <p className="text-sm text-red-600 mt-1">
                Verifique a tela <strong>Perecíveis / FLV</strong> para detalhes e ação imediata.
                Produtos FLV com menos de 5 dias de validade estão listados para descarte ou promoção.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fluxo do dia — timeline visual */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky-500" /> Fluxo Operacional do Dia
        </h3>
        <div className="grid grid-cols-4 gap-0">
          {[
            { label: 'Entradas\nrecebidas', value: '3 NF-e', color: 'bg-sky-500', step: 1 },
            { label: 'Pedidos\nfaturados', value: `${kpis?.nfesHoje || 0} NF-e`, color: 'bg-emerald-500', step: 2 },
            { label: 'Romaneios\nna rota', value: '5 veículos', color: 'bg-amber-500', step: 3 },
            { label: 'Entregas\nconcluídas', value: '4 rotas', color: 'bg-violet-500', step: 4 },
          ].map((item, i, arr) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={`h-10 w-10 rounded-full ${item.color} flex items-center justify-center text-white text-xs font-bold`}>
                  {item.step}
                </div>
                <p className="text-xs font-medium text-gray-600 mt-2 text-center whitespace-pre-line">{item.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{item.value}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="h-0.5 w-full bg-gray-200 mx-1 mb-6" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
