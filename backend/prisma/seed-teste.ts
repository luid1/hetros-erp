/**
 * Seed de TESTE — popula dados operacionais para demonstração ponta-a-ponta:
 * clientes, fornecedores, transportadoras, frotas (veículos), pedidos de venda
 * (com itens), NF-es e notas fiscais (Invoices — camada fiscal Rodada 3).
 *
 * Idempotente: pode rodar várias vezes sem duplicar (usa chaves únicas).
 * Pré-requisito: rodar antes `npx ts-node prisma/seed.ts` (tenant, filial,
 * usuário admin e produtos FLV com saldo).
 *
 * Rodar: npx ts-node prisma/seed-teste.ts
 */
import { PrismaClient, InvoiceStatus, TaxType } from '@prisma/client';

const prisma = new PrismaClient();

const reais = (n: number) => n.toFixed(2);
const toCents = (n: number) => Math.round(n * 100);

async function main() {
  console.log('🌱 Seed de TESTE — dados operacionais...\n');

  // ── 0. Pré-requisitos (tenant / filial / admin / produtos) ─────
  const tenant = await prisma.tenant.findUnique({ where: { cnpj: '00.000.000/0001-00' } });
  if (!tenant) throw new Error('Tenant Hetros não encontrado. Rode `npx ts-node prisma/seed.ts` primeiro.');

  const filial = await prisma.filial.findUnique({
    where: { tenantId_codigo: { tenantId: tenant.id, codigo: '1001' } },
  });
  if (!filial) throw new Error('Filial 1001 não encontrada. Rode o seed base primeiro.');

  const admin = await prisma.usuario.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: 'luid@hetros.com.br' } },
  });
  if (!admin) throw new Error('Usuário admin LUID não encontrado. Rode o seed base primeiro.');

  const produtos = await prisma.produto.findMany({ where: { tenantId: tenant.id }, orderBy: { codigo: 'asc' } });
  if (produtos.length === 0) throw new Error('Nenhum produto encontrado. Rode o seed base primeiro.');
  const prodPorCodigo = Object.fromEntries(produtos.map((p) => [p.codigo, p]));
  const emitenteCnpj = tenant.cnpj;

  // ── 1. Clientes ────────────────────────────────────────────────
  const clientesDefs = [
    { cnpjCpf: '11.111.111/0001-11', razaoSocial: 'Sacolão Bom Preço Ltda', nomeFantasia: 'Bom Preço', cidade: 'São Paulo', uf: 'SP', prazo: 28 },
    { cnpjCpf: '22.222.222/0001-22', razaoSocial: 'Rede Hortifruti Central SA', nomeFantasia: 'Hortifruti Central', cidade: 'Guarulhos', uf: 'SP', prazo: 30 },
    { cnpjCpf: '33.333.333/0001-33', razaoSocial: 'Mercado do Zé Eireli', nomeFantasia: 'Mercado do Zé', cidade: 'Osasco', uf: 'SP', prazo: 21 },
    { cnpjCpf: '44.444.444/0001-44', razaoSocial: 'Restaurante Sabor & Cia Ltda', nomeFantasia: 'Sabor & Cia', cidade: 'Santo André', uf: 'SP', prazo: 14 },
    { cnpjCpf: '55.555.555/0001-55', razaoSocial: 'Feira Orgânica Vila Verde ME', nomeFantasia: 'Vila Verde', cidade: 'São Paulo', uf: 'SP', prazo: 7 },
  ];
  const clientes: Record<string, any> = {};
  for (const c of clientesDefs) {
    const cli = await prisma.cliente.upsert({
      where: { tenantId_cnpjCpf: { tenantId: tenant.id, cnpjCpf: c.cnpjCpf } },
      update: { razaoSocial: c.razaoSocial, nomeFantasia: c.nomeFantasia, prazoMedio: c.prazo },
      create: {
        tenantId: tenant.id, tipo: 'PJ', razaoSocial: c.razaoSocial, nomeFantasia: c.nomeFantasia,
        cnpjCpf: c.cnpjCpf, prazoMedio: c.prazo, limiteCredito: 50000,
        email: `contato@${c.nomeFantasia.toLowerCase().replace(/[^a-z]/g, '')}.com.br`,
        telefone: '(11) 3000-0000',
        enderecoJson: { rua: 'Rua das Hortaliças', numero: '100', bairro: 'Centro', cidade: c.cidade, uf: c.uf, cep: '01000-000' },
      },
    });
    clientes[c.cnpjCpf] = cli;
  }
  console.log(`✅ ${clientesDefs.length} clientes`);

  // ── 2. Fornecedores (produtores rurais / atacadistas) ──────────
  const fornecedoresDefs = [
    { cnpj: '66.666.666/0001-66', razaoSocial: 'Fazenda Boa Terra Agrícola', nomeFantasia: 'Boa Terra', cidade: 'Ibiúna', uf: 'SP' },
    { cnpj: '77.777.777/0001-77', razaoSocial: 'Cooperativa Vale do Sol', nomeFantasia: 'Vale do Sol', cidade: 'Mogi das Cruzes', uf: 'SP' },
    { cnpj: '88.888.888/0001-88', razaoSocial: 'Sítio Recanto Verde Produtos', nomeFantasia: 'Recanto Verde', cidade: 'Piedade', uf: 'SP' },
  ];
  const fornecedores: Record<string, any> = {};
  for (const f of fornecedoresDefs) {
    const forn = await prisma.fornecedor.upsert({
      where: { tenantId_cnpj: { tenantId: tenant.id, cnpj: f.cnpj } },
      update: { razaoSocial: f.razaoSocial, nomeFantasia: f.nomeFantasia },
      create: {
        tenantId: tenant.id, razaoSocial: f.razaoSocial, nomeFantasia: f.nomeFantasia, cnpj: f.cnpj,
        prazoEntrega: 1, tipoParceria: 'COMPRA_DIRETA', pix: f.cnpj,
        email: `vendas@${f.nomeFantasia.toLowerCase().replace(/[^a-z]/g, '')}.com.br`, telefone: '(11) 4000-0000',
        localizacaoPropriedade: `${f.cidade}/${f.uf}`,
        enderecoJson: { rua: 'Estrada Rural', numero: 'km 12', bairro: 'Zona Rural', cidade: f.cidade, uf: f.uf, cep: '18000-000' },
      },
    });
    fornecedores[f.cnpj] = forn;
  }
  console.log(`✅ ${fornecedoresDefs.length} fornecedores`);

  // ── 3. Transportadoras ─────────────────────────────────────────
  const transportadorasDefs = [
    { cnpj: '99.999.999/0001-99', razaoSocial: 'TransFrio Logística Ltda', nomeFantasia: 'TransFrio', tipoVeiculo: 'TRUCK', regiao: 'Grande SP', freteKg: 0.35 },
    { cnpj: '10.101.010/0001-10', razaoSocial: 'Rápido Hortifruti Transportes', nomeFantasia: 'Rápido Hortifruti', tipoVeiculo: 'VAN', regiao: 'Capital', freteKg: 0.28 },
    { cnpj: '12.121.212/0001-12', razaoSocial: 'Expresso Vale Cargas SA', nomeFantasia: 'Expresso Vale', tipoVeiculo: 'BITRUCK', regiao: 'Interior SP', freteKg: 0.42 },
  ];
  const transportadoras: Record<string, any> = {};
  for (const t of transportadorasDefs) {
    const transp = await prisma.transportadora.upsert({
      where: { tenantId_cnpj: { tenantId: tenant.id, cnpj: t.cnpj } },
      update: { razaoSocial: t.razaoSocial, nomeFantasia: t.nomeFantasia },
      create: {
        tenantId: tenant.id, razaoSocial: t.razaoSocial, nomeFantasia: t.nomeFantasia, cnpj: t.cnpj,
        antt: `ANTT-${Math.floor(Math.random() * 900000 + 100000)}`, tipoVeiculo: t.tipoVeiculo,
        regiaoAtuacao: t.regiao, freteBaseKg: t.freteKg, email: 'log@transp.com.br', telefone: '(11) 5000-0000',
        enderecoJson: { rua: 'Av. dos Caminhoneiros', numero: '500', bairro: 'Industrial', cidade: 'São Paulo', uf: 'SP', cep: '02000-000' },
      },
    });
    transportadoras[t.cnpj] = transp;
  }
  console.log(`✅ ${transportadorasDefs.length} transportadoras`);

  // ── 4. Frotas (veículos por transportadora) ────────────────────
  const veiculosDefs = [
    { placa: 'FRZ1A23', transp: '99.999.999/0001-99', tipo: 'TRUCK', marca: 'Mercedes-Benz', modelo: 'Atego 1719', capacidadeKg: 8000, refrigerado: true, motorista: 'João Silva' },
    { placa: 'FRZ2B34', transp: '99.999.999/0001-99', tipo: 'TRUCK', marca: 'Volkswagen', modelo: 'Delivery 11.180', capacidadeKg: 7000, refrigerado: true, motorista: 'Pedro Santos' },
    { placa: 'RHF3C45', transp: '10.101.010/0001-10', tipo: 'VAN', marca: 'Renault', modelo: 'Master', capacidadeKg: 1500, refrigerado: false, motorista: 'Carlos Souza' },
    { placa: 'RHF4D56', transp: '10.101.010/0001-10', tipo: 'VAN', marca: 'Fiat', modelo: 'Ducato', capacidadeKg: 1800, refrigerado: true, motorista: 'Marcos Lima' },
    { placa: 'EXV5E67', transp: '12.121.212/0001-12', tipo: 'BITRUCK', marca: 'Scania', modelo: 'P310', capacidadeKg: 14000, refrigerado: true, motorista: 'Antônio Rocha' },
    { placa: 'EXV6F78', transp: '12.121.212/0001-12', tipo: 'CARRETA', marca: 'Volvo', modelo: 'VM 270', capacidadeKg: 22000, refrigerado: false, motorista: 'José Pereira' },
  ];
  for (const v of veiculosDefs) {
    await prisma.veiculo.upsert({
      where: { tenantId_placa: { tenantId: tenant.id, placa: v.placa } },
      update: { motoristaPadrao: v.motorista },
      create: {
        tenantId: tenant.id, transportadoraId: transportadoras[v.transp].id, placa: v.placa, uf: 'SP',
        tipo: v.tipo, marca: v.marca, modelo: v.modelo, anoFabricacao: 2021,
        capacidadeKg: v.capacidadeKg, propriedade: 'TERCEIRO', motoristaPadrao: v.motorista, refrigerado: v.refrigerado,
      },
    });
  }
  console.log(`✅ ${veiculosDefs.length} veículos (frotas)`);

  // ── 5. Pedidos de venda (com itens) ────────────────────────────
  // Cada pedido: cliente, 2-3 itens de produtos FLV, totais calculados.
  const pedidosDefs = [
    { numero: 1001, cliente: '11.111.111/0001-11', status: 'FATURADO' as const, itens: [['BAT25', 20], ['TOM20', 15], ['CEB20', 10]] },
    { numero: 1002, cliente: '22.222.222/0001-22', status: 'FATURADO' as const, itens: [['MAC18', 8], ['BAN18', 12]] },
    { numero: 1003, cliente: '33.333.333/0001-33', status: 'CONFIRMADO' as const, itens: [['LAR20', 25], ['CENO20', 10], ['PIM10', 6]] },
    { numero: 1004, cliente: '44.444.444/0001-44', status: 'SEPARADO' as const, itens: [['OVO30', 30], ['ALF', 5]] },
    { numero: 1005, cliente: '55.555.555/0001-55', status: 'ENTREGUE' as const, itens: [['MELA', 40], ['TOM20', 8]] },
    { numero: 1006, cliente: '11.111.111/0001-11', status: 'RASCUNHO' as const, itens: [['BAT25', 10], ['CEB20', 5]] },
  ];
  const transpCnpjs = Object.keys(transportadoras);
  const pedidos: any[] = [];
  for (const [idx, pd] of pedidosDefs.entries()) {
    let pedido = await prisma.pedido.findFirst({
      where: { tenantId: tenant.id, filialOrigemId: filial.id, numero: pd.numero },
      include: { itens: true },
    });
    if (!pedido) {
      const itensData = pd.itens.map(([codigo, qtd]) => {
        const prod = prodPorCodigo[codigo as string];
        const preco = Number(prod.precoVenda);
        const quantidade = Number(qtd);
        const total = preco * quantidade;
        return {
          produtoId: prod.id, descricao: prod.descricao, quantidade,
          unidade: 'CX', precoUnitario: preco, valorTotal: Number(reais(total)),
          cfop: '5102', aliquotaIcms: 0,
        };
      });
      const subtotal = itensData.reduce((a, i) => a + i.valorTotal, 0);
      const frete = pd.status === 'RASCUNHO' ? 0 : 120;
      const valorTotal = Number(reais(subtotal + frete));

      pedido = await prisma.pedido.create({
        data: {
          tenantId: tenant.id, filialOrigemId: filial.id, clienteId: clientes[pd.cliente].id,
          usuarioId: admin.id, numero: pd.numero, tipo: 'VENDA', status: pd.status,
          subtotal: Number(reais(subtotal)), valorFrete: frete, valorTotal,
          tipoFrete: 'CIF', transportadoraId: transportadoras[transpCnpjs[idx % transpCnpjs.length]].id,
          formaPagamento: 'BOLETO', condicaoPagamento: 'A_PRAZO', numeroParcelas: 1,
          dataEmissao: new Date(Date.now() - (idx + 1) * 86400000),
          itens: { create: itensData },
        },
        include: { itens: true },
      });
    }
    pedidos.push({ ...pedido, _def: pd });
  }
  console.log(`✅ ${pedidosDefs.length} pedidos de venda (com itens)`);

  // ── 6. NF-es (para pedidos faturados/entregues) ────────────────
  let serieNumero = 1;
  const pedidosFaturaveis = pedidos.filter((p) => ['FATURADO', 'ENTREGUE'].includes(p._def.status));
  for (const pedido of pedidosFaturaveis) {
    const numero = serieNumero++;
    const existe = await prisma.nFe.findFirst({
      where: { tenantId: tenant.id, filialId: filial.id, serie: '1', numero, modelo: '55' },
    });
    if (existe) continue;
    const valorProdutos = Number(pedido.subtotal);
    const valorNfe = Number(pedido.valorTotal);
    await prisma.nFe.create({
      data: {
        tenantId: tenant.id, filialId: filial.id, clienteId: pedido.clienteId, pedidoId: pedido.id,
        tipo: 'NFE', modelo: '55', serie: '1', numero,
        chaveAcesso: `3524${String(Date.now()).slice(-8)}${String(numero).padStart(9, '0')}${'0'.repeat(23)}`.slice(0, 44),
        status: 'EMITIDO', tipoOperacao: 'SAIDA', finalidade: '1',
        naturezaOperacao: 'VENDA DE MERCADORIA', cfop: '5102', emitenteCnpj,
        destCnpjCpf: clientes[pedido._def.cliente].cnpjCpf,
        destRazaoSocial: clientes[pedido._def.cliente].razaoSocial,
        valorProdutos, valorNfe, valorIcms: 0, formaPagamento: '15',
        dataEmissao: new Date(),
      },
    });
  }
  console.log(`✅ ${pedidosFaturaveis.length} NF-es emitidas`);

  // ── 7. Invoices (camada fiscal Rodada 3) ───────────────────────
  // Gera notas fiscais a partir dos pedidos faturáveis, com impostos em centavos.
  const impostosDef = [
    { type: TaxType.ICMS, ratePct: 18 },
    { type: TaxType.PIS, ratePct: 1.65 },
    { type: TaxType.COFINS, ratePct: 7.6 },
  ];
  let invoiceSeq = (await prisma.invoice.count({ where: { tenantId: tenant.id } }));
  for (const [i, pedido] of pedidosFaturaveis.entries()) {
    const jaTem = await prisma.invoice.count({
      where: { tenantId: tenant.id, orderId: pedido.id, status: { not: InvoiceStatus.CANCELED } },
    });
    if (jaTem > 0) continue;

    const netCents = toCents(Number(pedido.valorTotal));
    const taxRows = impostosDef.map((t) => ({
      type: t.type,
      rate: Math.round(t.ratePct * 100), // pontos-base
      value: Math.round((netCents * t.ratePct) / 100),
    }));
    const taxCents = taxRows.reduce((a, t) => a + t.value, 0);
    const grossCents = netCents + taxCents;
    invoiceSeq++;
    const padded = String(invoiceSeq).padStart(9, '0');
    const invoiceNumber = `${padded.slice(0, 3)}.${padded.slice(3, 6)}.${padded.slice(6)}`;
    const status = i === 0 ? InvoiceStatus.ISSUED : InvoiceStatus.DRAFT;

    await prisma.invoice.create({
      data: {
        tenantId: tenant.id, invoiceNumber, series: '1', status,
        orderId: pedido.id, customerId: pedido.clienteId,
        netValue: netCents, taxValue: taxCents, grossValue: grossCents,
        createdById: admin.id, issuedAt: status === InvoiceStatus.ISSUED ? new Date() : null,
        taxes: { create: taxRows },
        auditLogs: {
          create: {
            action: 'GENERATE', oldStatus: null, newStatus: InvoiceStatus.DRAFT,
            userId: admin.id, message: `Nota ${invoiceNumber} gerada (seed de teste) a partir do pedido ${pedido.numero}.`,
          },
        },
      },
    });
  }
  console.log(`✅ Notas fiscais (Invoices) geradas para os pedidos faturáveis`);

  console.log('\n🎉 Seed de teste concluído!\n');
  console.log('─────────────────────────────────────');
  console.log(`   Clientes:        ${clientesDefs.length}`);
  console.log(`   Fornecedores:    ${fornecedoresDefs.length}`);
  console.log(`   Transportadoras: ${transportadorasDefs.length}`);
  console.log(`   Veículos:        ${veiculosDefs.length}`);
  console.log(`   Pedidos:         ${pedidosDefs.length}`);
  console.log(`   NF-es:           ${pedidosFaturaveis.length}`);
  console.log('─────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Erro no seed de teste:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
