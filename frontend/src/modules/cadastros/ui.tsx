import { ReactNode } from 'react';
import { Plus, Search, X, Save } from 'lucide-react';

/**
 * Kit de UI dark para o módulo de Cadastros (FLV / Ceasa).
 * Visual sofisticado e minimalista, alinhado à sidebar escura do ERP.
 */

// Classes reutilizáveis (dark)
export const inp = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40';
export const lbl = 'block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1';

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
export const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Shell da página: fundo dark ocupando a área de conteúdo
export function CadastroShell({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full bg-[#0b1220] text-slate-200">{children}</div>;
}

// Barra superior com título + botão "Novo Cadastro"
export function TopBar({ icon, titulo, subtitulo, onNovo, novoLabel = 'Novo Cadastro', extra }:
  { icon: ReactNode; titulo: string; subtitulo?: string; onNovo?: () => void; novoLabel?: string; extra?: ReactNode }) {
  return (
    <div className="border-b border-slate-800 px-5 py-3 flex items-center justify-between shrink-0 bg-[#0e1729]">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">{icon}</div>
        <div>
          <h1 className="text-base font-bold text-white leading-tight">{titulo}</h1>
          {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {onNovo && (
          <button onClick={onNovo} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-sky-900/30">
            <Plus className="h-4 w-4" /> {novoLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Barra de filtros (busca + filtros rápidos)
export function FilterBar({ busca, onBusca, placeholder = 'Buscar...', children }:
  { busca: string; onBusca: (v: string) => void; placeholder?: string; children?: ReactNode }) {
  return (
    <div className="border-b border-slate-800 px-5 py-2.5 flex flex-wrap items-center gap-3 shrink-0 bg-[#0e1729]">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input value={busca} onChange={e => onBusca(e.target.value)} placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500" />
      </div>
      {children}
    </div>
  );
}

// Chips de filtro rápido
export function Chips({ value, onChange, options }:
  { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${value === o.value ? 'bg-sky-500/15 border-sky-500/50 text-sky-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Wrapper de tabela dark
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#111d33] rounded-xl border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 text-left font-semibold text-slate-400 text-xs uppercase tracking-wide bg-slate-800/40 ${className}`}>{children}</th>;
}

export function StatusBadge({ ativo, ativoLabel = 'ATIVO', inativoLabel = 'INATIVO' }: { ativo: boolean; ativoLabel?: string; inativoLabel?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ativo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
      {ativo ? ativoLabel : inativoLabel}
    </span>
  );
}

// Barra de ocupação (para Filiais/Boxes)
export function OcupacaoBar({ pct }: { pct: number }) {
  const cor = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full ${cor} rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400 w-9 text-right">{Math.round(pct)}%</span>
    </div>
  );
}

// Modal dark com header/footer fixos
export function Modal({ titulo, onClose, onSalvar, salvando, children, salvarLabel = 'Salvar', wide }:
  { titulo: string; onClose: () => void; onSalvar?: () => void; salvando?: boolean; children: ReactNode; salvarLabel?: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-[#111d33] border border-slate-700 rounded-xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} max-h-[92vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 shrink-0">
          <h2 className="font-bold text-white text-sm">{titulo}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
        {onSalvar && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-700 shrink-0">
            <button onClick={onClose} className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-700">Cancelar</button>
            <button onClick={onSalvar} disabled={salvando}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1.5">
              {salvando ? 'Salvando…' : <><Save className="h-4 w-4" /> {salvarLabel}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Cabeçalho de seção dentro do modal
export function Secao({ icon, titulo }: { icon?: ReactNode; titulo: string }) {
  return <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide pt-1">{icon}{titulo}</div>;
}

// Campo rotulado
export function Campo({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><label className={lbl}>{label}</label>{children}</div>;
}

// Estado de carregamento / vazio
export function Loader() {
  return <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>;
}
export function Vazio({ icon, texto }: { icon: ReactNode; texto: string }) {
  return <div className="text-center text-slate-500 py-16"><div className="mx-auto mb-2 opacity-40 flex justify-center">{icon}</div><p className="text-sm">{texto}</p></div>;
}
