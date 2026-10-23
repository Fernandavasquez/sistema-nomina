#!/usr/bin/env bash
# Respaldo diario de la base de datos y de los documentos subidos (DPI, recibos, licencias).
# Se guarda en ~/respaldos y se conservan los últimos 14 días.
# Lo ejecuta cron todos los días (vea deploy/README.md).
set -euo pipefail

cd "$(dirname "$0")/.."
DESTINO="$HOME/respaldos"
FECHA="$(date +%Y-%m-%d_%H%M)"
mkdir -p "$DESTINO"

# Base de datos (formato comprimido de PostgreSQL)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DESTINO/nomina_$FECHA.dump"

# Documentos subidos
docker compose exec -T backend tar -czf - -C /app uploads > "$DESTINO/uploads_$FECHA.tar.gz"

# Borra respaldos de más de 14 días
find "$DESTINO" -type f -mtime +14 -delete

echo "Respaldo listo: $DESTINO ($FECHA)"
