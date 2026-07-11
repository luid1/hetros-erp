@echo off
setlocal
title Hetros ERP - Inicializacao
cd /d "%~dp0"

echo ============================================
echo   HETROS ERP - subindo tudo no localhost
echo ============================================
echo.

REM ---------------------------------------------------------
REM 1) Garante que o Docker Desktop esta rodando
REM ---------------------------------------------------------
echo [1/5] Verificando Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo   Docker nao esta pronto. Abrindo Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo   Aguardando o engine do Docker responder ^(pode levar 1-2 min^)...
    :waitdocker
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if errorlevel 1 goto waitdocker
)
echo   Docker OK.
echo.

REM ---------------------------------------------------------
REM 2) Sobe Postgres (5433) + Redis (6380)
REM ---------------------------------------------------------
echo [2/5] Subindo containers (Postgres 5433 + Redis 6380)...
docker compose up -d
if errorlevel 1 (
    echo   ERRO ao subir containers. Abortando.
    pause
    exit /b 1
)
echo   Containers no ar.
echo.

REM ---------------------------------------------------------
REM 3) Prisma: aplica migrations + gera client
REM ---------------------------------------------------------
echo [3/5] Aplicando migrations do banco...
pushd backend
call npx prisma migrate deploy
call npx prisma generate
popd
echo   Banco pronto.
echo.

REM ---------------------------------------------------------
REM 4) Backend (porta 3002) em janela propria
REM ---------------------------------------------------------
echo [4/5] Iniciando BACKEND na porta 3002...
start "Hetros BACKEND (3002)" cmd /k "cd /d "%~dp0backend" && npm run start:dev"
echo.

REM ---------------------------------------------------------
REM 5) Frontend (porta 3000) em janela propria
REM ---------------------------------------------------------
echo [5/5] Iniciando FRONTEND na porta 3000...
start "Hetros FRONTEND (3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.

echo ============================================
echo   Tudo iniciado!
echo   Backend:  http://localhost:3002/api/docs
echo   Frontend: http://localhost:3000
echo   Login:    luid@hetros.com.br / admin123
echo ============================================
echo.
echo Aguardando o BACKEND (3002) ficar pronto antes de abrir o navegador...
echo (a primeira compilacao do Nest pode levar ~30-60s)
:waitbackend
timeout /t 3 /nobreak >nul
curl -s -o nul -m 2 http://localhost:3002/api/docs
if errorlevel 1 goto waitbackend
echo   Backend pronto. Aguardando o frontend...
timeout /t 4 /nobreak >nul
start "" http://localhost:3000

endlocal
