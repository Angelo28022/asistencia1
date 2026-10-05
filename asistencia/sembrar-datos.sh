#!/usr/bin/env bash
# Loads the demo users and attendance from seed/seed-datos.sql.
set -euo pipefail
cd "$(dirname "$0")"

if ! docker compose ps --status running --services 2>/dev/null | grep -qx db; then
  echo "[ERROR] La base de datos no está corriendo. Ejecuta primero ./iniciar.sh"
  exit 1
fi

echo "Cargando datos de ejemplo (18 empleados y sus asistencias de las últimas 6 semanas)..."
docker compose exec -T db mariadb -uasistencia -pasistencia control_asistencia < seed/seed-datos.sql
echo "Listo. Los empleados de ejemplo entran con la clave 123456 (por ejemplo: mrodriguez / 123456)."
