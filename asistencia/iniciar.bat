@echo off
rem Starts the attendance app with Docker Desktop and opens the login page.
chcp 65001 >nul
title Asistencia - Iniciar
pushd "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] No se encontro Docker.
  echo Instala Docker Desktop desde https://www.docker.com/products/docker-desktop/
  echo y vuelve a ejecutar este archivo.
  goto fin_error
)

docker info >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Docker Desktop no esta abierto.
  echo Abrelo, espera a que diga "Engine running" y vuelve a ejecutar este archivo.
  goto fin_error
)

echo.
echo Construyendo y levantando la aplicacion...
echo (la primera vez tarda unos minutos porque descarga las imagenes)
echo.
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo levantar la aplicacion. Revisa el mensaje de arriba.
  goto fin_error
)

echo.
echo Esperando a que la aplicacion responda...
set /a intentos=0
:esperar
curl -s -o nul -f http://localhost:8090/admin/vistas/login.html
if not errorlevel 1 goto lista
set /a intentos+=1
if %intentos% geq 60 (
  echo [ERROR] La aplicacion no respondio a tiempo. Prueba abrir http://localhost:8090/admin/vistas/login.html
  goto fin_error
)
timeout /t 2 /nobreak >nul
goto esperar

:lista
echo.
echo ==============================================
echo  Listo. Abriendo http://localhost:8090
echo  Usuario: admin    Clave: admin
echo  Para apagarla: ejecuta detener.bat
echo ==============================================
start "" "http://localhost:8090/admin/vistas/login.html"
popd
pause
exit /b 0

:fin_error
popd
pause
exit /b 1
