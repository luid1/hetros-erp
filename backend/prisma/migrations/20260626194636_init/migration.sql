-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA_COMPRA', 'ENTRADA_DEVOLUCAO', 'SAIDA_VENDA', 'SAIDA_DEVOLUCAO_FORNECEDOR', 'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'PERDA', 'AVARIA', 'PICKING');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('RASCUNHO', 'CONFIRMADO', 'EM_SEPARACAO', 'SEPARADO', 'FATURADO', 'ENTREGUE', 'CANCELADO', 'DEVOLVIDO');

-- CreateEnum
CREATE TYPE "StatusDFe" AS ENUM ('RASCUNHO', 'PENDENTE_EMISSAO', 'EMITIDO', 'CANCELADO', 'DENEGADO', 'INUTILIZADO', 'CONTINGENCIA');

-- CreateEnum
CREATE TYPE "TipoDFe" AS ENUM ('NFE', 'NFCE', 'CTE', 'MDFE');

-- CreateEnum
CREATE TYPE "StatusFinanceiro" AS ENUM ('ABERTO', 'PARCIAL', 'PAGO', 'VENCIDO', 'CANCELADO', 'RENEGOCIADO');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('DEBITO', 'CREDITO');

-- CreateEnum
CREATE TYPE "StatusRomaneio" AS ENUM ('ABERTO', 'EM_ROTA', 'ENTREGUE_PARCIAL', 'ENTREGUE', 'RETORNADO');

-- CreateEnum
CREATE TYPE "TipoEntidade" AS ENUM ('CLIENTE', 'FORNECEDOR', 'TRANSPORTADORA');

-- CreateEnum
CREATE TYPE "OrigemProduto" AS ENUM ('NACIONAL_0', 'NACIONAL_3', 'NACIONAL_4', 'NACIONAL_5', 'NACIONAL_8', 'ESTRANGEIRA_IMPORTACAO_DIRETA_1', 'ESTRANGEIRA_ADQUIRIDA_MERCADO_INTERNO_2', 'ESTRANGEIRA_SEM_SIMILAR_NACIONAL_6', 'ESTRANGEIRA_COM_CONTEUDO_IMPORTADO_7');

-- CreateEnum
CREATE TYPE "TipoAjusteInventario" AS ENUM ('DIFERENCA_CONTAGEM', 'PERDA_VALIDADE', 'AVARIA_FISICA', 'ROUBO_FURTO', 'QUEBRA_OPERACIONAL');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "ie" TEXT,
    "im" TEXT,
    "regimeTributario" TEXT NOT NULL DEFAULT 'SIMPLES_NACIONAL',
    "crt" INTEGER NOT NULL DEFAULT 1,
    "emailNfe" TEXT,
    "webhookSecret" TEXT,
    "plano" TEXT NOT NULL DEFAULT 'BASICO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filial" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "ie" TEXT,
    "endereco" JSONB NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'DEPOSITO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Filial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permissao" (
    "id" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Permissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermissao" (
    "roleId" TEXT NOT NULL,
    "permissaoId" TEXT NOT NULL,

    CONSTRAINT "RolePermissao_pkey" PRIMARY KEY ("roleId","permissaoId")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "cpf" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcesso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioFilial" (
    "usuarioId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,

    CONSTRAINT "UsuarioFilial_pkey" PRIMARY KEY ("usuarioId","filialId")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PJ',
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpjCpf" TEXT NOT NULL,
    "ie" TEXT,
    "im" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "enderecoJson" JSONB NOT NULL,
    "contatoJson" JSONB,
    "limiteCredito" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "prazoMedio" INTEGER NOT NULL DEFAULT 30,
    "tabelaPreco" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sintegraOk" BOOLEAN NOT NULL DEFAULT false,
    "sintegraAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "ie" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "enderecoJson" JSONB NOT NULL,
    "contatoJson" JSONB,
    "prazoEntrega" INTEGER NOT NULL DEFAULT 1,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transportadora" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "ie" TEXT,
    "antt" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "enderecoJson" JSONB NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transportadora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeMedida" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'COMERCIAL',

    CONSTRAINT "UnidadeMedida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "codigoBarrasSecun" TEXT,
    "descricao" TEXT NOT NULL,
    "descricaoCompleta" TEXT,
    "ncm" TEXT NOT NULL,
    "cest" TEXT,
    "cfop" TEXT,
    "origem" "OrigemProduto" NOT NULL DEFAULT 'NACIONAL_0',
    "unidadeMedidaId" TEXT NOT NULL,
    "unidadeTributavel" TEXT,
    "fatorConversao" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "pesoBruto" DECIMAL(10,4),
    "pesoLiquido" DECIMAL(10,4),
    "volumeM3" DECIMAL(10,4),
    "categoria" TEXT,
    "grupo" TEXT,
    "subgrupo" TEXT,
    "marca" TEXT,
    "aliquotaIcms" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "aliquotaPis" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "aliquotaCofins" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "cstIcms" TEXT,
    "cstPis" TEXT,
    "cstCofins" TEXT,
    "requerLote" BOOLEAN NOT NULL DEFAULT false,
    "requerValidade" BOOLEAN NOT NULL DEFAULT false,
    "diasAlertaValidade" INTEGER NOT NULL DEFAULT 3,
    "temperaturaMin" DECIMAL(5,2),
    "temperaturaMax" DECIMAL(5,2),
    "empilhamentoMax" INTEGER,
    "precoCompra" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "precoCusto" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "precoVenda" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "margemMinima" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "estoqueMinimo" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "estoqueMaximo" DECIMAL(12,4),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalizacaoFisica" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "rua" TEXT NOT NULL,
    "bloco" TEXT,
    "prateleira" TEXT NOT NULL,
    "nivel" TEXT,
    "posicao" TEXT,
    "capacidadeKg" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LocalizacaoFisica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "dataFabricacao" TIMESTAMP(3),
    "dataValidade" TIMESTAMP(3),
    "fornecedorLote" TEXT,
    "quantidadeInicial" DECIMAL(12,4) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstoqueSaldo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "loteId" TEXT,
    "localizacaoId" TEXT,
    "quantidade" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "quantidadeReservada" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "quantidadeDisponivel" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "custoMedio" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueSaldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "loteId" TEXT,
    "localizacaoId" TEXT,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" DECIMAL(12,4) NOT NULL,
    "custoUnitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "saldoAnterior" DECIMAL(12,4) NOT NULL,
    "saldoFinal" DECIMAL(12,4) NOT NULL,
    "pedidoId" TEXT,
    "entradaId" TEXT,
    "nfeId" TEXT,
    "filialDestinoId" TEXT,
    "observacoes" TEXT,
    "dataMovimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntradaMercadoria" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "chaveNfeEntrada" TEXT,
    "xmlOriginal" TEXT,
    "numeroNf" TEXT,
    "serieNf" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,

    CONSTRAINT "EntradaMercadoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemEntrada" (
    "id" TEXT NOT NULL,
    "entradaId" TEXT NOT NULL,
    "produtoId" TEXT,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT,
    "quantidade" DECIMAL(12,4) NOT NULL,
    "unidade" TEXT NOT NULL,
    "valorUnitario" DECIMAL(12,4) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "loteNumero" TEXT,
    "dataValidade" TIMESTAMP(3),

    CONSTRAINT "ItemEntrada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "observacoes" TEXT,

    CONSTRAINT "Inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemInventario" (
    "id" TEXT NOT NULL,
    "inventarioId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "loteId" TEXT,
    "quantidadeSistema" DECIMAL(12,4) NOT NULL,
    "quantidadeContada" DECIMAL(12,4),
    "diferenca" DECIMAL(12,4),
    "tipoAjuste" "TipoAjusteInventario",
    "ajusteGerado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialOrigemId" TEXT NOT NULL,
    "filialDestinoId" TEXT,
    "clienteId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'VENDA',
    "status" "StatusPedido" NOT NULL DEFAULT 'RASCUNHO',
    "observacoes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descontoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorFrete" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tipoFrete" TEXT,
    "transportadoraId" TEXT,
    "dataEntrega" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "loteId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(12,4) NOT NULL,
    "quantidadeSeparada" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "unidade" TEXT NOT NULL,
    "precoUnitario" DECIMAL(12,4) NOT NULL,
    "desconto" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "cfop" TEXT,
    "cstIcms" TEXT,
    "aliquotaIcms" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "baseCalcIcms" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorIcms" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorPis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorCofins" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NFe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "clienteId" TEXT,
    "pedidoId" TEXT,
    "tipo" "TipoDFe" NOT NULL DEFAULT 'NFE',
    "modelo" TEXT NOT NULL DEFAULT '55',
    "serie" TEXT NOT NULL DEFAULT '1',
    "numero" INTEGER NOT NULL,
    "chaveAcesso" TEXT,
    "protocolo" TEXT,
    "status" "StatusDFe" NOT NULL DEFAULT 'RASCUNHO',
    "naturezaOperacao" TEXT NOT NULL,
    "cfop" TEXT NOT NULL,
    "emitenteCnpj" TEXT NOT NULL,
    "destCnpjCpf" TEXT,
    "destRazaoSocial" TEXT,
    "destEnderecoJson" JSONB,
    "valorProdutos" DECIMAL(12,2) NOT NULL,
    "valorFrete" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorSeguro" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorDesconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorIcms" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorPis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorCofins" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorNfe" DECIMAL(12,2) NOT NULL,
    "xmlEmitido" TEXT,
    "xmlCancelamento" TEXT,
    "pdfDanfe" TEXT,
    "motivoCancelamento" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "dataCancelamento" TIMESTAMP(3),
    "tipoFrete" TEXT,
    "transportadoraId" TEXT,
    "formaPagamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NFe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemNFe" (
    "id" TEXT NOT NULL,
    "nfeId" TEXT NOT NULL,
    "produtoId" TEXT,
    "ordem" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT NOT NULL,
    "cfop" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" DECIMAL(12,4) NOT NULL,
    "valorUnitario" DECIMAL(12,4) NOT NULL,
    "valorDesconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "origemProd" TEXT NOT NULL DEFAULT '0',
    "cstCsosn" TEXT NOT NULL,
    "baseCalcIcms" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "aliquotaIcms" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "valorIcms" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cstPis" TEXT NOT NULL DEFAULT '07',
    "baseCalcPis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "aliquotaPis" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "valorPis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cstCofins" TEXT NOT NULL DEFAULT '07',
    "baseCalcCofins" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "aliquotaCofins" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "valorCofins" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loteNumero" TEXT,
    "dataValidade" TIMESTAMP(3),

    CONSTRAINT "ItemNFe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicataNFe" (
    "id" TEXT NOT NULL,
    "nfeId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "dataVenc" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "DuplicataNFe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CTe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "transportadoraId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "serie" TEXT NOT NULL DEFAULT '1',
    "chaveAcesso" TEXT,
    "protocolo" TEXT,
    "status" "StatusDFe" NOT NULL DEFAULT 'RASCUNHO',
    "cfop" TEXT NOT NULL DEFAULT '6351',
    "naturezaOperacao" TEXT NOT NULL DEFAULT 'PRESTACAO DE SERV. DE TRANSP.',
    "ufInicio" TEXT NOT NULL,
    "ufFim" TEXT NOT NULL,
    "valorServico" DECIMAL(12,2) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "xmlEmitido" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CTe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Veiculo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transportadoraId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "anoFabricacao" INTEGER,
    "capacidadeKg" DECIMAL(10,2),
    "capacidadeM3" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Romaneio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "transportadoraId" TEXT,
    "veiculoId" TEXT,
    "numero" INTEGER NOT NULL,
    "dataSaida" TIMESTAMP(3),
    "dataRetorno" TIMESTAMP(3),
    "status" "StatusRomaneio" NOT NULL DEFAULT 'ABERTO',
    "regiaoRota" TEXT,
    "motorista" TEXT,
    "pesoTotalKg" DECIMAL(12,2),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Romaneio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RomaneioItem" (
    "id" TEXT NOT NULL,
    "romaneioId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "ordemEntrega" INTEGER NOT NULL,
    "entregue" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,

    CONSTRAINT "RomaneioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanoContas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "nivel" INTEGER NOT NULL,
    "pai" TEXT,
    "analitica" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanoContas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaReceber" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT,
    "clienteId" TEXT,
    "pedidoId" TEXT,
    "nfeId" TEXT,
    "descricao" TEXT NOT NULL,
    "numero" TEXT,
    "valorOriginal" DECIMAL(12,2) NOT NULL,
    "valorPago" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorDesconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorJuros" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'ABERTO',
    "formaPagamento" TEXT,
    "gatewayId" TEXT,
    "linkBoleto" TEXT,
    "pixCopiaECola" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaReceber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaPagar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT,
    "fornecedorId" TEXT,
    "entradaId" TEXT,
    "descricao" TEXT NOT NULL,
    "numero" TEXT,
    "valorOriginal" DECIMAL(12,2) NOT NULL,
    "valorPago" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorDesconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorJuros" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'ABERTO',
    "formaPagamento" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LancamentoFinanceiro" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filialId" TEXT,
    "planoContasId" TEXT,
    "contaReceberId" TEXT,
    "contaPagarId" TEXT,
    "tipo" "TipoLancamento" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "dataCompetencia" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "historico" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LancamentoFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "modulo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_cnpj_key" ON "Tenant"("cnpj");

-- CreateIndex
CREATE INDEX "Tenant_cnpj_idx" ON "Tenant"("cnpj");

-- CreateIndex
CREATE INDEX "Filial_tenantId_idx" ON "Filial"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Filial_tenantId_codigo_key" ON "Filial"("tenantId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_nome_key" ON "Role"("tenantId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Permissao_modulo_acao_key" ON "Permissao"("modulo", "acao");

-- CreateIndex
CREATE INDEX "Usuario_tenantId_idx" ON "Usuario"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_tenantId_email_key" ON "Usuario"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Cliente_tenantId_idx" ON "Cliente"("tenantId");

-- CreateIndex
CREATE INDEX "Cliente_tenantId_razaoSocial_idx" ON "Cliente"("tenantId", "razaoSocial");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_tenantId_cnpjCpf_key" ON "Cliente"("tenantId", "cnpjCpf");

-- CreateIndex
CREATE INDEX "Fornecedor_tenantId_idx" ON "Fornecedor"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_tenantId_cnpj_key" ON "Fornecedor"("tenantId", "cnpj");

-- CreateIndex
CREATE INDEX "Transportadora_tenantId_idx" ON "Transportadora"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Transportadora_tenantId_cnpj_key" ON "Transportadora"("tenantId", "cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeMedida_tenantId_sigla_key" ON "UnidadeMedida"("tenantId", "sigla");

-- CreateIndex
CREATE INDEX "Produto_tenantId_idx" ON "Produto"("tenantId");

-- CreateIndex
CREATE INDEX "Produto_tenantId_codigoBarras_idx" ON "Produto"("tenantId", "codigoBarras");

-- CreateIndex
CREATE INDEX "Produto_tenantId_ncm_idx" ON "Produto"("tenantId", "ncm");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_tenantId_codigo_key" ON "Produto"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "LocalizacaoFisica_tenantId_filialId_idx" ON "LocalizacaoFisica"("tenantId", "filialId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalizacaoFisica_tenantId_filialId_rua_prateleira_key" ON "LocalizacaoFisica"("tenantId", "filialId", "rua", "prateleira");

-- CreateIndex
CREATE INDEX "Lote_tenantId_produtoId_idx" ON "Lote"("tenantId", "produtoId");

-- CreateIndex
CREATE INDEX "Lote_tenantId_dataValidade_idx" ON "Lote"("tenantId", "dataValidade");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_tenantId_produtoId_numero_key" ON "Lote"("tenantId", "produtoId", "numero");

-- CreateIndex
CREATE INDEX "EstoqueSaldo_tenantId_filialId_idx" ON "EstoqueSaldo"("tenantId", "filialId");

-- CreateIndex
CREATE INDEX "EstoqueSaldo_tenantId_filialId_produtoId_idx" ON "EstoqueSaldo"("tenantId", "filialId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueSaldo_tenantId_filialId_produtoId_loteId_localizacao_key" ON "EstoqueSaldo"("tenantId", "filialId", "produtoId", "loteId", "localizacaoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_tenantId_filialId_idx" ON "MovimentacaoEstoque"("tenantId", "filialId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_tenantId_produtoId_idx" ON "MovimentacaoEstoque"("tenantId", "produtoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_tenantId_tipo_dataMovimento_idx" ON "MovimentacaoEstoque"("tenantId", "tipo", "dataMovimento");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_nfeId_idx" ON "MovimentacaoEstoque"("nfeId");

-- CreateIndex
CREATE UNIQUE INDEX "EntradaMercadoria_chaveNfeEntrada_key" ON "EntradaMercadoria"("chaveNfeEntrada");

-- CreateIndex
CREATE INDEX "EntradaMercadoria_tenantId_dataEntrada_idx" ON "EntradaMercadoria"("tenantId", "dataEntrada");

-- CreateIndex
CREATE INDEX "EntradaMercadoria_chaveNfeEntrada_idx" ON "EntradaMercadoria"("chaveNfeEntrada");

-- CreateIndex
CREATE INDEX "ItemEntrada_entradaId_idx" ON "ItemEntrada"("entradaId");

-- CreateIndex
CREATE INDEX "Inventario_tenantId_filialId_idx" ON "Inventario"("tenantId", "filialId");

-- CreateIndex
CREATE INDEX "ItemInventario_inventarioId_idx" ON "ItemInventario"("inventarioId");

-- CreateIndex
CREATE INDEX "Pedido_tenantId_filialOrigemId_idx" ON "Pedido"("tenantId", "filialOrigemId");

-- CreateIndex
CREATE INDEX "Pedido_tenantId_status_idx" ON "Pedido"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_tenantId_filialOrigemId_numero_key" ON "Pedido"("tenantId", "filialOrigemId", "numero");

-- CreateIndex
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "ItemPedido_produtoId_idx" ON "ItemPedido"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "NFe_chaveAcesso_key" ON "NFe"("chaveAcesso");

-- CreateIndex
CREATE INDEX "NFe_tenantId_filialId_idx" ON "NFe"("tenantId", "filialId");

-- CreateIndex
CREATE INDEX "NFe_tenantId_status_idx" ON "NFe"("tenantId", "status");

-- CreateIndex
CREATE INDEX "NFe_chaveAcesso_idx" ON "NFe"("chaveAcesso");

-- CreateIndex
CREATE UNIQUE INDEX "NFe_tenantId_filialId_serie_numero_modelo_key" ON "NFe"("tenantId", "filialId", "serie", "numero", "modelo");

-- CreateIndex
CREATE INDEX "ItemNFe_nfeId_idx" ON "ItemNFe"("nfeId");

-- CreateIndex
CREATE INDEX "DuplicataNFe_nfeId_idx" ON "DuplicataNFe"("nfeId");

-- CreateIndex
CREATE UNIQUE INDEX "CTe_chaveAcesso_key" ON "CTe"("chaveAcesso");

-- CreateIndex
CREATE INDEX "CTe_tenantId_idx" ON "CTe"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CTe_tenantId_filialId_serie_numero_key" ON "CTe"("tenantId", "filialId", "serie", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Veiculo_tenantId_placa_key" ON "Veiculo"("tenantId", "placa");

-- CreateIndex
CREATE INDEX "Romaneio_tenantId_filialId_idx" ON "Romaneio"("tenantId", "filialId");

-- CreateIndex
CREATE UNIQUE INDEX "Romaneio_tenantId_filialId_numero_key" ON "Romaneio"("tenantId", "filialId", "numero");

-- CreateIndex
CREATE INDEX "RomaneioItem_romaneioId_idx" ON "RomaneioItem"("romaneioId");

-- CreateIndex
CREATE INDEX "PlanoContas_tenantId_idx" ON "PlanoContas"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanoContas_tenantId_codigo_key" ON "PlanoContas"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "ContaReceber_tenantId_filialId_idx" ON "ContaReceber"("tenantId", "filialId");

-- CreateIndex
CREATE INDEX "ContaReceber_tenantId_status_idx" ON "ContaReceber"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ContaReceber_tenantId_dataVencimento_idx" ON "ContaReceber"("tenantId", "dataVencimento");

-- CreateIndex
CREATE INDEX "ContaReceber_clienteId_idx" ON "ContaReceber"("clienteId");

-- CreateIndex
CREATE INDEX "ContaPagar_tenantId_filialId_idx" ON "ContaPagar"("tenantId", "filialId");

-- CreateIndex
CREATE INDEX "ContaPagar_tenantId_status_idx" ON "ContaPagar"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ContaPagar_tenantId_dataVencimento_idx" ON "ContaPagar"("tenantId", "dataVencimento");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_tenantId_filialId_dataCompetencia_idx" ON "LancamentoFinanceiro"("tenantId", "filialId", "dataCompetencia");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_tenantId_tipo_idx" ON "LancamentoFinanceiro"("tenantId", "tipo");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_modulo_createdAt_idx" ON "AuditLog"("tenantId", "modulo", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_usuarioId_idx" ON "AuditLog"("tenantId", "usuarioId");

-- CreateIndex
CREATE INDEX "AuditLog_entidade_entidadeId_idx" ON "AuditLog"("entidade", "entidadeId");

-- AddForeignKey
ALTER TABLE "Filial" ADD CONSTRAINT "Filial_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissao" ADD CONSTRAINT "RolePermissao_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissao" ADD CONSTRAINT "RolePermissao_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "Permissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioFilial" ADD CONSTRAINT "UsuarioFilial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioFilial" ADD CONSTRAINT "UsuarioFilial_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fornecedor" ADD CONSTRAINT "Fornecedor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transportadora" ADD CONSTRAINT "Transportadora_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_unidadeMedidaId_fkey" FOREIGN KEY ("unidadeMedidaId") REFERENCES "UnidadeMedida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalizacaoFisica" ADD CONSTRAINT "LocalizacaoFisica_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueSaldo" ADD CONSTRAINT "EstoqueSaldo_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueSaldo" ADD CONSTRAINT "EstoqueSaldo_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueSaldo" ADD CONSTRAINT "EstoqueSaldo_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueSaldo" ADD CONSTRAINT "EstoqueSaldo_localizacaoId_fkey" FOREIGN KEY ("localizacaoId") REFERENCES "LocalizacaoFisica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_localizacaoId_fkey" FOREIGN KEY ("localizacaoId") REFERENCES "LocalizacaoFisica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "EntradaMercadoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_nfeId_fkey" FOREIGN KEY ("nfeId") REFERENCES "NFe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaMercadoria" ADD CONSTRAINT "EntradaMercadoria_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEntrada" ADD CONSTRAINT "ItemEntrada_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "EntradaMercadoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInventario" ADD CONSTRAINT "ItemInventario_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInventario" ADD CONSTRAINT "ItemInventario_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_filialOrigemId_fkey" FOREIGN KEY ("filialOrigemId") REFERENCES "Filial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_filialDestinoId_fkey" FOREIGN KEY ("filialDestinoId") REFERENCES "Filial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFe" ADD CONSTRAINT "NFe_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFe" ADD CONSTRAINT "NFe_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFe" ADD CONSTRAINT "NFe_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFe" ADD CONSTRAINT "NFe_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemNFe" ADD CONSTRAINT "ItemNFe_nfeId_fkey" FOREIGN KEY ("nfeId") REFERENCES "NFe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemNFe" ADD CONSTRAINT "ItemNFe_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicataNFe" ADD CONSTRAINT "DuplicataNFe_nfeId_fkey" FOREIGN KEY ("nfeId") REFERENCES "NFe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CTe" ADD CONSTRAINT "CTe_transportadoraId_fkey" FOREIGN KEY ("transportadoraId") REFERENCES "Transportadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Veiculo" ADD CONSTRAINT "Veiculo_transportadoraId_fkey" FOREIGN KEY ("transportadoraId") REFERENCES "Transportadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Romaneio" ADD CONSTRAINT "Romaneio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Romaneio" ADD CONSTRAINT "Romaneio_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Romaneio" ADD CONSTRAINT "Romaneio_transportadoraId_fkey" FOREIGN KEY ("transportadoraId") REFERENCES "Transportadora"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Romaneio" ADD CONSTRAINT "Romaneio_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RomaneioItem" ADD CONSTRAINT "RomaneioItem_romaneioId_fkey" FOREIGN KEY ("romaneioId") REFERENCES "Romaneio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RomaneioItem" ADD CONSTRAINT "RomaneioItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoContas" ADD CONSTRAINT "PlanoContas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_nfeId_fkey" FOREIGN KEY ("nfeId") REFERENCES "NFe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "EntradaMercadoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_planoContasId_fkey" FOREIGN KEY ("planoContasId") REFERENCES "PlanoContas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_contaReceberId_fkey" FOREIGN KEY ("contaReceberId") REFERENCES "ContaReceber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "ContaPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
