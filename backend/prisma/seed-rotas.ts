/**
 * Seed de ROTAS — popula clientes com CEPs em zonas distintas e pedidos
 * CONFIRMADOS para HOJE, prontos para roteirização na Torre de Controle.
 *
 * Idempotente: clientes por CNPJ (upsert); pedidos por número (não duplica).
 * Pré-requisito: `seed.ts` (tenant/filial/admin/produtos) e, idealmente,
 * `seed-teste.ts` (veículos com capacidade).
 *
 * Rodar: npx ts-node prisma/seed-rotas.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const reais = (n: number) => Number(n.toFixed(2));

async function main() {
  console.log('🌱 Seed de ROTAS — clientes com CEP + pedidos para roteirizar...\n');

  const tenant = await prisma.tenant.findUnique({ where: { cnpj: '00.000.000/0001-00' } });
  if (!tenant) throw new Error('Tenant não encontrado. Rode `npx ts-node prisma/seed.ts` primeiro.');

  const filial = await prisma.filial.findUnique({
    where: { tenantId_codigo: { tenantId: tenant.id, codigo: '1001' } },
  });
  if (!filial) throw new Error('Filial 1001 não encontrada.');

  const admin = await prisma.usuario.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: 'luid@hetros.com.br' } },
  });
  if (!admin) throw new Error('Admin LUID não encontrado.');

  const produtos = await prisma.produto.findMany({ where: { tenantId: tenant.id }, orderBy: { codigo: 'asc' } });
  if (produtos.length === 0) throw new Error('Nenhum produto. Rode o seed base primeiro.');

  // ── Clientes com CEPs em zonas distintas (a região sai do prefixo do CEP) ──
  // Buckets do RouteOptimizer: 010-039=CENTRO · 040-059=OESTE · 060-089=NORTE
  //                            090-199=LESTE · 200-299=SUL
  const clientesDefs = [
    { cnpjCpf: '11.111.111/0001-11', nome: 'Bom Preço',          rua: 'Av. Paulista',            num: '1500', bairro: 'Bela Vista',   cidade: 'São Paulo',    cep: '01310-100', zona: 'CENTRO' },
    { cnpjCpf: '22.222.222/0001-22', nome: 'Hortifruti Central', rua: 'Rua da Cantareira',       num: '306',  bairro: 'Centro',       cidade: 'São Paulo',    cep: '02011-000', zona: 'CENTRO' },
    { cnpjCpf: '33.333.333/0001-33', nome: 'Mercado do Zé',      rua: 'Rua dos Pinheiros',       num: '820',  bairro: 'Pinheiros',    cidade: 'São Paulo',    cep: '05424-020', zona: 'OESTE'  },
    { cnpjCpf: '44.444.444/0001-44', nome: 'Sabor & Cia',        rua: 'Rua Vergueiro',           num: '1000', bairro: 'Vila Mariana', cidade: 'São Paulo',    cep: '04101-000', zona: 'OESTE'  },
    { cnpjCpf: '55.555.555/0001-55', nome: 'Vila Verde',         rua: 'Av. Aricanduva',          num: '5555', bairro: 'Aricanduva',   cidade: 'São Paulo',    cep: '08210-000', zona: 'NORTE'  },
    { cnpjCpf: '13.131.313/0001-31', nome: 'Empório Norte',      rua: 'Av. Guarulhos',           num: '2400', bairro: 'Centro',       cidade: 'Guarulhos',    cep: '07011-000', zona: 'NORTE'  },
    { cnpjCpf: '14.141.414/0001-41', nome: 'Feira Leste',        rua: 'Av. Antônio Frederico',   num: '900',  bairro: 'Centro',       cidade: 'Limeira',      cep: '13480-000', zona: 'LESTE'  },
    { cnpjCpf: '15.151.515/0001-51', nome: 'Atacadão Sul',       rua: 'Av. Goiás',               num: '1200', bairro: 'Santo Antônio',cidade: 'São Caetano',  cep: '09541-000', zona: 'LESTE'  },
  ];

  const clientes: Record<string, any> = {};
  for (const c of clientesDefs) {
    const enderecoJson = {
      logradouro: c.rua, rua: c.rua, numero: c.num, bairro: c.bairro,
      cidade: c.cidade, uf: 'SP', cep: c.cep,
    };
    const cli = await prisma.cliente.upsert({
      where: { tenantId_cnpjCpf: { tenantId: tenant.id, cnpjCpf: c.cnpjCpf } },
      update: { nomeFantasia: c.nome, enderecoJson },
      create: {
        tenantId: tenant.id, tipo: 'PJ', razaoSocial: `${c.nome} Comércio Ltda`,
        nomeFantasia: c.nome, cnpjCpf: c.cnpjCpf, prazoMedio: 21, limiteCredito: 50000,
        email: `contato@${c.nome.toLowerCase().replace(/[^a-z]/g, '')}.com.br`,
        telefone: '(11) 3000-0000', enderecoJson,
      },
    });
    clientes[c.cnpjCpf] = cli;
  }
  console.log(`✅ ${clientesDefs.length} clientes com CEP por zona (${new Set(clientesDefs.map((c) => c.zona)).size} regiões)`);

  // ── Pedidos CONFIRMADOS para HOJE (um por cliente) ──
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  let criados = 0;
  for (const [idx, c] of clientesDefs.entries()) {
    const numero = 2001 + idx;
    const existe = await prisma.pedido.findFirst({
      where: { tenantId: tenant.id, filialOrigemId: filial.id, numero },
    });
    if (existe) continue;

    // 2-3 itens variando os produtos disponíveis
    const qtdItens = 2 + (idx % 2);
    const itensData = Array.from({ length: qtdItens }).map((_, i) => {
      const prod = produtos[(idx + i) % produtos.length];
      const quantidade = 10 + ((idx + i) % 4) * 8; // 10..34 caixas
      const preco = Number(prod.precoVenda);
      return {
        produtoId: prod.id, descricao: prod.descricao, quantidade,
        unidade: 'CX', precoUnitario: preco, valorTotal: reais(preco * quantidade),
        cfop: '5102', aliquotaIcms: 0,
      };
    });

    const subtotal = itensData.reduce((a, i) => a + i.valorTotal, 0);
    const frete = 120;
    const volumes = itensData.reduce((a, i) => a + i.quantidade, 0);
    const pesoTotal = volumes * 20; // ~20 kg por caixa

    await prisma.pedido.create({
      data: {
        tenantId: tenant.id, filialOrigemId: filial.id, clienteId: clientes[c.cnpjCpf].id,
        usuarioId: admin.id, numero, tipo: 'VENDA', status: 'CONFIRMADO',
        subtotal: reais(subtotal), valorFrete: frete, valorTotal: reais(subtotal + frete),
        pesoTotal, volumes, tipoFrete: 'CIF',
        formaPagamento: 'BOLETO', condicaoPagamento: 'A_PRAZO', numeroParcelas: 1,
        dataEmissao: hoje, dataEntrega: hoje,
        itens: { create: itensData },
      },
    });
    criados++;
  }
  console.log(`✅ ${criados} pedidos CONFIRMADOS para hoje (${hoje.toLocaleDateString('pt-BR')})`);
  console.log('\n🎯 Pronto! Abra a Torre de Controle no dia de hoje e clique em "🤖 Otimizar Rotas com IA".');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed de rotas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
