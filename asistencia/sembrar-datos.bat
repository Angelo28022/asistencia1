@echo off
rem Loads the demo users and attendance from seed\seed-datos.sql.
chcp 65001 >nul
title Asistencia - Datos de ejemplo
pushd "%~dp0"
echo.
echo Cargando datos de ejemplo (18 empleados y sus asistencias de las ultimas 6 semanas)...
docker compose exec -T db mariadb -uasistencia -pasistencia control_asistencia < seed\seed-datos.sql
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudieron cargar los datos. Ejecuta primero iniciar.bat y vuelve a intentar.
  popd
  pause
  exit /b 1
)
echo.
echo Listo. Los empleados de ejemplo entran con la clave 123456 (por ejemplo: mrodriguez / 123456).
popd
pause
