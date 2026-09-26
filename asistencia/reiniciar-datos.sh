#!/usr/bin/env bash
# Deletes the database volume and reloads the original SQL dump.
set -euo pipefail
cd "$(dirname "$0")"
echo "ATENCIÓN: esto BORRA todos los datos (usuarios y asistencias que hayas cargado)"
echo "y deja la base como en el archivo 'control_asistencia (3).sql'."
read -r -p "¿Seguro que quieres continuar? [s/N] " respuesta
if [[ ! "$respuesta" =~ ^[sS]$ ]]; then
  echo "Cancelado. No se tocó nada."
  exit 0
fi
docker compose down -v
docker compose up -d --build
echo "Listo. Base de datos reiniciada. Usuario: admin  Clave: admin"
