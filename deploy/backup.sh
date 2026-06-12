#!/bin/bash
# Nightly Postgres backup -> GCS. Installed by Claude (production round).
set -euo pipefail
TS=$(date +%Y%m%d-%H%M%S)
BUCKET="gs://nexus-erp-backups-responsive-sun-462613-d0"
FILE="/tmp/nexuserp-${TS}.sql.gz"
docker exec nexus-postgres pg_dump -U postgres -d nexuserp | gzip > "$FILE"
gsutil -q cp "$FILE" "$BUCKET/postgres/"
rm -f "$FILE"
echo "$(date -Is) backup uploaded: nexuserp-${TS}.sql.gz" >> /var/log/nexus-backup.log
