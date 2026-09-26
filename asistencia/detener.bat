@echo off
rem Stops the app. Data is kept (it lives in a Docker volume).
chcp 65001 >nul
title Asistencia - Detener
pushd "%~dp0"
docker compose down
echo.
echo Aplicacion detenida. Los datos se conservan; vuelve a abrirla con iniciar.bat
popd
pause
