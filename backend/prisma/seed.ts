/**
 * Seed: cria o tenant Hetros, filial CEAGESP e o usuário LUID (Admin Master)
 * Rodar: npx ts-node prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do ERP WMS...\n');

  // ── 1. Permissões base do sistema ──────────────────────────────
  const modulos = ['ESTOQUE', 'PEDIDOS', 'NFE', 'FINANCEIRO', 'CADASTROS', 'AUDITORIA', 'RELATORIOS'];
  const acoes   = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EMITIR', 'APROVAR', 'CANCELAR'];

  for (const modulo of modulos) {
    for (const acao of acoes) {
      await prisma.permissao.upsert({
        where: { modulo_acao: { modulo, acao } },
        update: {},
        create: { modulo, acao, descricao: `${acao} em ${modulo}` },
      });
    }
  }
  console.log(`✅ ${modulos.length * acoes.length} permissões criadas`);

  // ── 2. Tenant: Hetros ──────────────────────────────────────────
  let tenant = await prisma.tenant.findUnique({ where: { cnpj: '00.000.000/0001-00' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        razaoSocial:       'Hetros Distribuição Ltda',
        nomeFantasia:      'Hetros',
        cnpj:              '00.000.000/0001-00',
        regimeTributario:  'SIMPLES_NACIONAL',
        crt:               1,
      },
    });
    console.log(`✅ Tenant criado: ${tenant.razaoSocial}`);
  } else {
    console.log(`ℹ️  Tenant já existe: ${tenant.razaoSocial}`);
  }

  // ── 3. Filial: CEAGESP Box ─────────────────────────────────────
  let filial = await prisma.filial.findUnique({
    where: { tenantId_codigo: { tenantId: tenant.id, codigo: '1001' } },
  });
  if (!filial) {
    filial = await prisma.filial.create({
      data: {
        tenantId: tenant.id,
        codigo:   '1001',
        nome:     'Hetros — CEAGESP Box 42',
        tipo:     'MATRIZ',
        endereco: {
          rua:    'Av. Dr. Gastão Vidigal',
          numero: '1946',
          bairro: 'Vila Leopoldina',
          cidade: 'São Paulo',
          uf:     'SP',
          cep:    '05313-900',
        },
      },
    });
    console.log(`✅ Filial criada: ${filial.nome}`);
  } else {
    console.log(`ℹ️  Filial já existe: ${filial.nome}`);
  }

  // ── 4. Roles ───────────────────────────────────────────────────
  const todasPermissoes = await prisma.permissao.findMany();

  const rolesDefs = [
    {
      nome:      'ADMIN',
      descricao: 'Administrador master — acesso total',
      perms:     todasPermissoes.map((p) => p.id), // tudo
    },
    {
      nome:      'OPERADOR_WMS',
      descricao: 'Operador de armazém — estoque e pedidos',
      perms:     todasPermissoes
        .filter((p) => ['ESTOQUE', 'PEDIDOS'].includes(p.modulo) && p.acao !== 'DELETE')
        .map((p) => p.id),
    },
    {
      nome:      'COMERCIAL',
      descricao: 'Vendedor — pedidos e clientes',
      perms:     todasPermissoes
        .filter((p) => ['PEDIDOS', 'CADASTROS'].includes(p.modulo) && ['CREATE', 'READ', 'UPDATE'].includes(p.acao))
        .map((p) => p.id),
    },
    {
      nome:      'FINANCEIRO',
      descricao: 'Financeiro — contas e relatórios',
      perms:     todasPermissoes
        .filter((p) => ['FINANCEIRO', 'RELATORIOS'].includes(p.modulo))
        .map((p) => p.id),
    },
    {
      nome:      'FISCAL',
      descricao: 'Fiscal — emissão de NF-e e CT-e',
      perms:     todasPermissoes
        .filter((p) => ['NFE', 'PEDIDOS'].includes(p.modulo))
        .map((p) => p.id),
    },
  ];

  const rolesMap: Record<string, string> = {};
  for (const rd of rolesDefs) {
    let role = await prisma.role.findUnique({
      where: { tenantId_nome: { tenantId: tenant.id, nome: rd.nome } },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          tenantId:  tenant.id,
          nome:      rd.nome,
          descricao: rd.descricao,
          permissoes: { create: rd.perms.map((id) => ({ permissaoId: id })) },
        },
      });
      console.log(`✅ Role criada: ${role.nome}`);
    } else {
      console.log(`ℹ️  Role já existe: ${role.nome}`);
    }
    rolesMap[rd.nome] = role.id;
  }

  // ── 5. Usuários ────────────────────────────────────────────────
  const usuariosBase = [
    {
      nome:     'LUID',
      email:    'luid@hetros.com.br',
      password: 'admin123',
      role:     'ADMIN',
    },
    {
      nome:     'Operador WMS',
      email:    'operador@hetros.com.br',
      password: 'operador123',
      role:     'OPERADOR_WMS',
    },
    {
      nome:     'Comercial',
      email:    'comercial@hetros.com.br',
      password: 'comercial123',
      role:     'COMERCIAL',
    },
    {
      nome:     'Financeiro',
      email:    'financeiro@hetros.com.br',
      password: 'financeiro123',
      role:     'FINANCEIRO',
    },
    {
      nome:     'Fiscal',
      email:    'fiscal@hetros.com.br',
      password: 'fiscal123',
      role:     'FISCAL',
    },
  ];

  for (const u of usuariosBase) {
    const existe = await prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
    });
    if (!existe) {
      const hash = await bcrypt.hash(u.password, 12);
      const novo = await prisma.usuario.create({
        data: {
          tenantId:     tenant.id,
          roleId:       rolesMap[u.role],
          nome:         u.nome,
          email:        u.email,
          passwordHash: hash,
          filiais:      { create: { filialId: filial.id } },
        },
      });
      console.log(`✅ Usuário criado: ${novo.nome} (${u.role}) — senha: ${u.password}`);
    } else {
      console.log(`ℹ️  Usuário já existe: ${u.nome}`);
    }
  }

  // ── 6. Localizações físicas de exemplo ─────────────────────────
  const localizacoes = [
    { rua: 'A', prateleira: '1' }, { rua: 'A', prateleira: '2' },
    { rua: 'B', prateleira: '1' }, { rua: 'B', prateleira: '2' },
    { rua: 'C', prateleira: '1' }, { rua: 'C', prateleira: '2' },
    { rua: 'CÂMARA', prateleira: '1' }, { rua: 'CÂMARA', prateleira: '2' },
  ];
  for (const loc of localizacoes) {
    await prisma.localizacaoFisica.upsert({
      where: { tenantId_filialId_rua_prateleira: { tenantId: tenant.id, filialId: filial.id, rua: loc.rua, prateleira: loc.prateleira } },
      update: {},
      create: { tenantId: tenant.id, filialId: filial.id, ...loc },
    });
  }
  console.log(`✅ ${localizacoes.length} localizações físicas criadas`);

  // ── 7. Unidades de medida ──────────────────────────────────────
  const unidadesDefs = [
    { sigla: 'KG', descricao: 'Quilograma' },
    { sigla: 'CX', descricao: 'Caixa' },
    { sigla: 'UN', descricao: 'Unidade' },
    { sigla: 'DZ', descricao: 'Dúzia' },
  ];
  const umMap: Record<string, string> = {};
  for (const u of unidadesDefs) {
    const um = await prisma.unidadeMedida.upsert({
      where: { tenantId_sigla: { tenantId: tenant.id, sigla: u.sigla } },
      update: {},
      create: { tenantId: tenant.id, sigla: u.sigla, descricao: u.descricao },
    });
    umMap[u.sigla] = um.id;
  }
  console.log(`✅ ${unidadesDefs.length} unidades de medida criadas`);

  // ── 8. Produtos FLV + saldo de estoque ─────────────────────────
  const produtosDefs = [
    { codigo: 'BAT25', barras: '7890000000017', descricao: 'BATATA LAVADA ESPECIAL SC 25KG', ncm: '07019000', un: 'CX', preco: 89.90,  estoque: 320 },
    { codigo: 'TOM20', barras: '7890000000024', descricao: 'TOMATE LONGA VIDA CX 20KG',     ncm: '07020000', un: 'CX', preco: 72.50,  estoque: 180 },
    { codigo: 'CEB20', barras: '7890000000031', descricao: 'CEBOLA NACIONAL SC 20KG',       ncm: '07031019', un: 'CX', preco: 65.00,  estoque: 240 },
    { codigo: 'BAN18', barras: '7890000000048', descricao: 'BANANA NANICA CX 18KG',         ncm: '08039000', un: 'CX', preco: 58.00,  estoque: 95  },
    { codigo: 'MAC18', barras: '7890000000055', descricao: 'MAÇÃ GALA CX 18KG',             ncm: '08081000', un: 'CX', preco: 130.00, estoque: 60  },
    { codigo: 'LAR20', barras: '7890000000062', descricao: 'LARANJA PERA SC 20KG',          ncm: '08051000', un: 'CX', preco: 48.00,  estoque: 150 },
    { codigo: 'CENO20', barras: '7890000000079', descricao: 'CENOURA LAVADA SC 20KG',       ncm: '07061000', un: 'CX', preco: 70.00,  estoque: 110 },
    { codigo: 'ALF', barras: '7890000000086', descricao: 'ALFACE CRESPA CX 12UN',           ncm: '07051100', un: 'CX', preco: 35.00,  estoque: 8   },
    { codigo: 'MAM',  barras: '7890000000093', descricao: 'MAMÃO FORMOSA CX 12KG',          ncm: '08072000', un: 'CX', preco: 62.00,  estoque: 0   },
    { codigo: 'MELA', barras: '7890000000109', descricao: 'MELANCIA GRAÚDA UN',             ncm: '08071100', un: 'UN', preco: 22.00,  estoque: 45  },
    { codigo: 'OVO30', barras: '7890000000116', descricao: 'OVO BRANCO GRANDE CARTELA 30UN', ncm: '04072100', un: 'CX', preco: 18.50, estoque: 200 },
    { codigo: 'PIM10', barras: '7890000000123', descricao: 'PIMENTÃO VERDE CX 10KG',        ncm: '07096010', un: 'CX', preco: 55.00,  estoque: 70  },
  ];
  const umCx = umMap['CX'];
  for (const p of produtosDefs) {
    const prod = await prisma.produto.upsert({
      where: { tenantId_codigo: { tenantId: tenant.id, codigo: p.codigo } },
      update: { precoVenda: p.preco, descricao: p.descricao },
      create: {
        tenantId: tenant.id,
        codigo: p.codigo,
        codigoBarras: p.barras,
        descricao: p.descricao,
        ncm: p.ncm,
        cfop: '5102',
        unidadeMedidaId: umMap[p.un] || umCx,
        categoria: 'FLV',
        precoVenda: p.preco,
        precoCusto: p.preco * 0.7,
        estoqueMinimo: 20,
      },
    });
    // saldo de estoque na filial
    const saldoExistente = await prisma.estoqueSaldo.findFirst({
      where: { tenantId: tenant.id, filialId: filial.id, produtoId: prod.id, loteId: null },
    });
    if (saldoExistente) {
      await prisma.estoqueSaldo.update({ where: { id: saldoExistente.id }, data: { quantidade: p.estoque } });
    } else {
      await prisma.estoqueSaldo.create({
        data: { tenantId: tenant.id, filialId: filial.id, produtoId: prod.id, quantidade: p.estoque },
      });
    }
  }
  console.log(`✅ ${produtosDefs.length} produtos FLV criados com saldo de estoque`);

  console.log('\n🎉 Seed concluído com sucesso!\n');
  console.log('─────────────────────────────────────');
  console.log('🔑 Credenciais de acesso:');
  console.log('   LUID (Admin Master) → luid@hetros.com.br / admin123');
  console.log('─────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
