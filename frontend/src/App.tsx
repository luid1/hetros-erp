import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PosicaoEstoque from './modules/estoque/pages/PosicaoEstoque';
import ControleCarga from './modules/logistica/pages/ControleCarga';
import TorreControle from './modules/logistica/pages/TorreControle';
import AppMotorista from './modules/logistica/pages/AppMotorista';
import AnaliseEstoqueFisico from './modules/estoque/pages/AnaliseEstoqueFisico';
import PedidosVenda from './modules/logistica/pages/PedidosVenda';
import Clientes from './modules/cadastros/pages/Clientes';
import Operacional from './modules/logistica/pages/Operacional';
import Lider from './modules/logistica/pages/Lider';
import FreteMotoristas from './modules/logistica/pages/FreteMotoristas';
import FrotasVeiculos from './modules/logistica/pages/FrotasVeiculos';
import Romaneios from './modules/logistica/pages/Romaneios';
import Custos from './modules/financeiro/pages/Custos';
import ContasReceber from './modules/financeiro/pages/ContasReceber';
import ContasPagar from './modules/financeiro/pages/ContasPagar';
import FluxoCaixa from './modules/financeiro/pages/FluxoCaixa';
import ControladoriaHub from './modules/financeiro/pages/ControladoriaHub';
import UsuariosAcessos from './modules/gerencial/pages/UsuariosAcessos';
import Relatorios from './modules/gerencial/pages/Relatorios';
import LogsAuditoria from './modules/gerencial/pages/LogsAuditoria';
import Configuracoes from './modules/gerencial/pages/Configuracoes';
import Produtos from './modules/cadastros/pages/Produtos';
import Fornecedores from './modules/cadastros/pages/Fornecedores';
import Transportadoras from './modules/cadastros/pages/Transportadoras';
import Filiais from './modules/cadastros/pages/Filiais';
import Pereciveis from './modules/estoque/pages/Pereciveis';
import Entradas from './modules/estoque/pages/Entradas';
import Movimentacoes from './modules/estoque/pages/Movimentacoes';
import Inventario from './modules/estoque/pages/Inventario';
import Compras from './modules/estoque/pages/Compras';
import DevolucoesCompra from './modules/estoque/pages/DevolucoesCompra';
import TabelasPreco from './modules/cadastros/pages/TabelasPreco';
import AppComprador from './modules/compras/pages/AppComprador';
import FinancialHub from './modules/financeiro/pages/FinancialHub';
import PlanoContas from './modules/financeiro/pages/PlanoContas';
import Vendedores from './modules/financeiro/pages/Vendedores';
import Comissoes from './modules/financeiro/pages/Comissoes';
import Tesouraria from './modules/financeiro/pages/Tesouraria';
import Recorrencias from './modules/financeiro/pages/Recorrencias';
import Funcionarios from './modules/financeiro/pages/Funcionarios';
import Folha from './modules/financeiro/pages/Folha';
import PagamentosMotorista from './modules/financeiro/pages/PagamentosMotorista';
import Faturamento from './modules/fiscal/pages/Faturamento';
import NotasEmitidas from './modules/fiscal/pages/NotasEmitidas';
import MatrizFiscal from './modules/fiscal/pages/MatrizFiscal';
import PainelFaturamento from './modules/fiscal/pages/PainelFaturamento';
import CteMdfe from './modules/fiscal/pages/CteMdfe';
import GestaoFiscal from './modules/fiscal/pages/GestaoFiscal';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full" />
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Guard de tela cheia (APK/WebView): sem o AppShell (menu do ERP), ocupa a tela toda.
// Se não estiver logado, manda pro /login guardando o destino em ?next= pra voltar depois.
function AppFullscreen({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(window.location.pathname)}`} replace />;
  return <div className="h-screen w-screen overflow-y-auto bg-white">{children}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Apps de tela cheia (empacotados como APK/WebView) — sem o menu do ERP */}
          <Route path="/app/comprador" element={<AppFullscreen><AppComprador /></AppFullscreen>} />
          <Route path="/app/motorista" element={<AppFullscreen><AppMotorista /></AppFullscreen>} />

          <Route path="/" element={<Guard><AppShell /></Guard>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Cadastros */}
            <Route path="cadastros/clientes" element={<Clientes />} />
            <Route path="cadastros/fornecedores" element={<Fornecedores />} />
            <Route path="cadastros/transportadoras" element={<Transportadoras />} />
            <Route path="cadastros/produtos" element={<Produtos />} />
            <Route path="cadastros/filiais" element={<Filiais />} />
            <Route path="cadastros/tabelas-preco" element={<TabelasPreco />} />

            {/* WMS */}
            <Route path="wms/posicao" element={<PosicaoEstoque />} />
            <Route path="wms/pereciveis" element={<Pereciveis />} />
            <Route path="wms/entradas" element={<Entradas />} />
            <Route path="wms/movimentacoes" element={<Movimentacoes />} />
            <Route path="wms/inventario" element={<Inventario />} />
            <Route path="wms/compras" element={<Compras />} />
            <Route path="wms/devolucoes-compra" element={<DevolucoesCompra />} />
            <Route path="compras/app" element={<AppComprador />} />
            <Route path="wms/analise-estoque" element={<AnaliseEstoqueFisico />} />

            {/* Logística */}
            <Route path="logistica/pedidos" element={<PedidosVenda />} />
            <Route path="logistica/carga" element={<ControleCarga />} />
            <Route path="logistica/torre" element={<TorreControle />} />
            <Route path="logistica/motorista" element={<AppMotorista />} />
            <Route path="logistica/lider" element={<Lider />} />
            <Route path="logistica/operacional" element={<Operacional />} />
            <Route path="logistica/frete" element={<FreteMotoristas />} />
            <Route path="logistica/romaneios" element={<Romaneios />} />
            <Route path="logistica/frotas" element={<FrotasVeiculos />} />

            {/* Fiscal */}
            <Route path="fiscal/nfe" element={<NotasEmitidas />} />
            <Route path="fiscal/emitir" element={<Faturamento />} />
            <Route path="fiscal/painel" element={<PainelFaturamento />} />
            <Route path="fiscal/matriz" element={<MatrizFiscal />} />
            <Route path="fiscal/cte" element={<CteMdfe />} />
            <Route path="fiscal/gestao" element={<GestaoFiscal />} />

            {/* Financeiro */}
            <Route path="financeiro/fluxo-caixa" element={<FluxoCaixa />} />
            <Route path="financeiro/receber" element={<ContasReceber />} />
            <Route path="financeiro/pagar" element={<ContasPagar />} />
            <Route path="financeiro/controladoria" element={<ControladoriaHub />} />
            <Route path="financeiro/dre" element={<FinancialHub />} />
            <Route path="financeiro/plano-contas" element={<PlanoContas />} />
            <Route path="financeiro/vendedores" element={<Vendedores />} />
            <Route path="financeiro/comissoes" element={<Comissoes />} />
            <Route path="financeiro/tesouraria" element={<Tesouraria />} />
            <Route path="financeiro/recorrencias" element={<Recorrencias />} />
            <Route path="financeiro/funcionarios" element={<Funcionarios />} />
            <Route path="financeiro/folha" element={<Folha />} />
            <Route path="financeiro/pagamentos-motorista" element={<PagamentosMotorista />} />
            <Route path="financeiro/custos" element={<Custos />} />

            {/* Gerencial */}
            <Route path="gerencial/relatorios" element={<Relatorios />} />
            <Route path="gerencial/auditoria" element={<LogsAuditoria />} />
            <Route path="gerencial/usuarios" element={<UsuariosAcessos />} />
            <Route path="gerencial/configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
