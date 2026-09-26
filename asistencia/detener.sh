#!/usr/bin/env bash
# Stops the app. Data is kept (it lives in a Docker volume).
set -euo pipefail
cd "$(dirname "$0")"
docker compose down
echo "Aplicación detenida. Los datos se conservan; vuelve a abrirla con ./iniciar.sh"
