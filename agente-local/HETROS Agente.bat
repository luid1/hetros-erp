@echo off
title HETROS - Agente Local (balanca + impressao)
cd /d "%~dp0"

rem Se existir o .exe empacotado, roda ele. Senao, roda via Node (modo dev).
if exist "dist\HETROS-Agente.exe" (
  "dist\HETROS-Agente.exe"
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Node.js nao encontrado. Instale o Node LTS ou gere o .exe com "npm run build".
    pause
    exit /b 1
  )
  node index.js
)

pause
