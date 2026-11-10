@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\vite\bin\vite.js" (
    echo Instalando dependencias del proyecto...
    call npm.cmd install
    if errorlevel 1 (
        echo No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Iniciar.ps1"
if errorlevel 1 (
    echo No se pudo iniciar Nuestro dia.
    pause
    exit /b 1
)
exit /b 0
