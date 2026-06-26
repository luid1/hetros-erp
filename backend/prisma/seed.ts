/**
 * Seed: cria o tenant Hetros, filial CEAGESP e o usuário LUID (Admin Master)
 * Rodar: npx ts-node prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  console.log('\n🎉 Seed concluído com sucesso!\n');
  console.log('─────────────────────────────────────');
  console.log('🔑 Credenciais de acesso:');
  console.log('   LUID (Admin Master) → luid@hetros.com.br / admin123');
  console.log('─────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
