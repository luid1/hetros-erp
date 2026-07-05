# ============================================================
#  Hetros ERP - Setup de banco + seed de teste
#  Uso: clique direito > "Executar com PowerShell"
#       ou no terminal:  .\setup-teste.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

# Caminho do backend relativo a este script (funciona de qualquer lugar).
$backend = Join-Path $PSScriptRoot 'backend'

Write-Host ''
Write-Host '=== Hetros ERP - Setup de teste ===' -ForegroundColor Cyan
Write-Host "Backend: $backend" -ForegroundColor DarkGray
Write-Host ''

if (-not (Test-Path (Join-Path $backend 'prisma\schema.prisma'))) {
    Write-Host "ERRO: schema.prisma nao encontrado em $backend\prisma" -ForegroundColor Red
    Write-Host 'Confirme que este script esta na raiz do projeto (hetros-erp-main).' -ForegroundColor Yellow
    exit 1
}

Set-Location $backend

Write-Host '[1/4] prisma db push (materializa as tabelas)...' -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) { Write-Host 'Falha no db push. O dev server esta parado?' -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host '[2/4] prisma generate (client atualizado)...' -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Host 'Falha no generate. Pare o dev server e rode de novo.' -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host '[3/4] seed base (tenant, filial, usuarios, produtos)...' -ForegroundColor Cyan
npm run prisma:seed
if ($LASTEXITCODE -ne 0) { Write-Host 'Falha no seed base.' -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host '[4/4] seed de teste (clientes, fornecedores, frotas, pedidos, NF-es, invoices)...' -ForegroundColor Cyan
npm run prisma:seed:teste
if ($LASTEXITCODE -ne 0) { Write-Host 'Falha no seed de teste.' -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host '=== Tudo pronto! ===' -ForegroundColor Green
Write-Host 'Suba o backend (npm run start:dev) e o frontend, e teste em Gestao Fiscal.' -ForegroundColor Green
Write-Host ''
