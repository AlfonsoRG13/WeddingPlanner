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

echo Iniciando el servidor local...
start "Nuestro dia - servidor" /D "%~dp0" cmd.exe /k "npm.cmd run dev"

echo Esperando a que el servidor este listo...
curl.exe --silent --fail --retry 30 --retry-connrefused --retry-delay 1 --max-time 2 --output NUL http://127.0.0.1:5173/api/guests
if errorlevel 1 (
    echo El servidor no respondio en http://127.0.0.1:5173
    echo Revisa la ventana del servidor para ver el error.
    pause
    exit /b 1
)

start "" "http://127.0.0.1:5173"
echo Aplicacion abierta en el navegador.
exit /b 0
