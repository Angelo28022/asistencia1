#!/usr/bin/env bash
# Starts the attendance app with Docker and opens the login page.
set -euo pipefail
cd "$(dirname "$0")"

URL="http://localhost:8090/admin/vistas/login.html"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] No se encontró Docker. Instálalo desde https://docs.docker.com/get-docker/"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "[ERROR] Docker no está corriendo. Ábrelo (o inicia el servicio) y vuelve a intentar."
  exit 1
fi

echo "Construyendo y levantando la aplicación (la primera vez tarda unos minutos)..."
docker compose up -d --build

echo "Esperando a que la aplicación responda..."
for _ in $(seq 1 60); do
  if curl -s -o /dev/null -f "$URL"; then
    echo
    echo "=============================================="
    echo " Listo: $URL"
    echo " Usuario: admin    Clave: admin"
    echo " Para apagarla: ./detener.sh"
    echo "=============================================="
    (xdg-open "$URL" || open "$URL") >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 2
done

echo "[ERROR] La aplicación no respondió a tiempo. Prueba abrir $URL"
exit 1
