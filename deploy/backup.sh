#!/bin/sh
# Nightly backup of the database to Cloudflare R2 (ADR 0040). Run by cron on the server:
#   15 3 * * * /opt/acrofunjam/backup.sh >> /home/deploy/backup.log 2>&1
# Restore: gunzip -c <file> | docker compose exec -T postgres psql -U acrofunjam -d acrofunjam
set -eu
cd "$(dirname "$0")"
set -a; . ./.env; set +a

file="acrofunjam-$(date -u +%Y-%m-%dT%H%M%SZ).sql.gz"
docker compose exec -T postgres pg_dump -U acrofunjam -d acrofunjam --clean --if-exists | gzip > "/tmp/$file"

docker run --rm -v /tmp:/backup:ro \
  -e AWS_ACCESS_KEY_ID="$BACKUP_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$BACKUP_SECRET_KEY" -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli:2.27.0 s3 cp "/backup/$file" "s3://$BACKUP_BUCKET/$file" --endpoint-url "$PHOTO_STORAGE_URL"

rm "/tmp/$file"
echo "$(date -u) backup $file sent"
