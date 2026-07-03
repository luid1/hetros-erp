import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PosicaoEstoque from './modules/estoque/pages/PosicaoEstoque';
import ControleCarga from './modules/logistica/pages/ControleCarga';
import AnaliseEstoqueFisico from './modules/estoque/pages/AnaliseEstoqueFisico';
import PedidosVenda from './modules/logistica/pages/PedidosVenda';
import Clientes from './modules/cadastros/pages/Clientes';
import Operacional from './modules/logistica/pages/Operacional';
import Lider from './modules/logistica/pages/Lider';
import FreteMotoristas from './modules/logistica/pages/FreteMotoristas';
import FrotasVeiculos from './modules/logistica/pages/FrotasVeiculos';
import Romaneios from './modules/logistica/pages/Romaneios';
import Custos from './modules/financeiro/pages/Custos';
import UsuariosAcessos from './modules/gerencial/pages/UsuariosAcessos';
import Produtos from './modules/cadastros/pages/Produtos';
import Fornecedores from './modules/cadastros/pages/Fornecedores';
import Transportadoras from './modules/cadastros/pages/Transportadoras';
import Filiais from './modules/cadastros/pages/Filiais';
import Pereciveis from './modules/estoque/pages/Pereciveis';
import Entradas from './modules/estoque/pages/Entradas';
import Movimentacoes from './modules/estoque/pages/Movimentacoes';
import Inventario from './modules/estoque/pages/Inventario';
import Compras from './modules/estoque/pages/Compras';
import Faturamento from './modules/fiscal/pages/Faturamento';
import NotasEmitidas from './modules/fiscal/pages/NotasEmitidas';
import MatrizFiscal from './modules/fiscal/pages/MatrizFiscal';
import PainelFaturamento from './modules/fiscal/pages/PainelFaturamento';
import CteMdfe from './modules/fiscal/pages/CteMdfe';

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <span className="text-2xl">🚧</span>
      </div>
      <p className="text-gray-700 font-semibold">{title}</p>
      <p className="text-gray-400 text-sm mt-1">Em desenvolvimento</p>
    </div>
  </div>
);

function Guard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full" />
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Guard><AppShell /></Guard>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Cadastros */}
            <Route path="cadastros/clientes" element={<Clientes />} />
            <Route path="cadastros/fornecedores" element={<Fornecedores />} />
            <Route path="cadastros/transportadoras" element={<Transportadoras />} />
            <Route path="cadastros/produtos" element={<Produtos />} />
            <Route path="cadastros/filiais" element={<Filiais />} />

            {/* WMS */}
            <Route path="wms/posicao" element={<PosicaoEstoque />} />
            <Route path="wms/pereciveis" element={<Pereciveis />} />
            <Route path="wms/entradas" element={<Entradas />} />
            <Route path="wms/movimentacoes" element={<Movimentacoes />} />
            <Route path="wms/inventario" element={<Inventario />} />
            <Route path="wms/compras" element={<Compras />} />
            <Route path="wms/analise-estoque" element={<AnaliseEstoqueFisico />} />

            {/* Logística */}
            <Route path="logistica/pedidos" element={<PedidosVenda />} />
            <Route path="logistica/carga" element={<ControleCarga />} />
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

            {/* Financeiro */}
            <Route path="financeiro/receber" element={<Placeholder title="Contas a Receber" />} />
            <Route path="financeiro/pagar" element={<Placeholder title="Contas a Pagar" />} />
            <Route path="financeiro/dre" element={<Placeholder title="DRE & Relatórios" />} />
            <Route path="financeiro/custos" element={<Custos />} />

            {/* Gerencial */}
            <Route path="gerencial/auditoria" element={<Placeholder title="Logs de Auditoria" />} />
            <Route path="gerencial/usuarios" element={<UsuariosAcessos />} />
            <Route path="gerencial/configuracoes" element={<Placeholder title="Configurações" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
