@echo off
rem Deletes the database volume and reloads the original SQL dump.
chcp 65001 >nul
title Asistencia - Reiniciar datos
pushd "%~dp0"
echo.
echo ATENCION: esto BORRA todos los datos (usuarios y asistencias que hayas cargado)
echo y deja la base como en el archivo control_asistencia (3).sql
echo.
choice /c SN /m "Seguro que quieres continuar"
if errorlevel 2 (
  echo Cancelado. No se toco nada.
  popd
  pause
  exit /b 0
)
docker compose down -v
docker compose up -d --build
echo.
echo Listo. Base de datos reiniciada. Usuario: admin  Clave: admin
popd
pause
