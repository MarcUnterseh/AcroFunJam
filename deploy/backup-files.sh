#!/bin/sh
# Weekly copy of the files of the bucket of the photos (photos of the poses, prepared videos and posters of the transitions)
# to the bucket of the backups, kept 30 days by its life cycle (ADR 0040, ADR 0041). The originals of the videos, waiting
# for their preparation, are not copied. Run by cron on the server, on Sunday:
#   45 3 * * 0 /opt/acrofunjam/backup-files.sh >> /home/deploy/backup.log 2>&1
# No other key: the files are read with the key of the API (PHOTO_STORAGE_*), and sent with the key of the backups
# (BACKUP_*), which cannot read the bucket of the photos. A mirror kept on the server makes each reading incremental.
# Restore: aws s3 cp s3://<backups>/<file> - | tar -xf - -C <directory>, then aws s3 sync <directory> s3://<photos>
set -eu
cd "$(dirname "$0")"
set -a; . ./.env; set +a

mirror=/var/tmp/acrofunjam-files
mkdir -p "$mirror"
aws() {
  docker run --rm -v "$mirror":/files -e AWS_DEFAULT_REGION=auto "$@"
}

aws -e AWS_ACCESS_KEY_ID="$PHOTO_STORAGE_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$PHOTO_STORAGE_SECRET_KEY" \
  amazon/aws-cli:2.27.0 s3 sync "s3://$PHOTO_STORAGE_BUCKET" /files --delete --exclude "originals/*" --only-show-errors \
  --endpoint-url "$PHOTO_STORAGE_URL"

file="acrofunjam-files-$(date -u +%Y-%m-%dT%H%M%SZ).tar"
tar -cf - -C "$mirror" . | docker run --rm -i \
  -e AWS_ACCESS_KEY_ID="$BACKUP_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$BACKUP_SECRET_KEY" -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli:2.27.0 s3 cp - "s3://$BACKUP_BUCKET/$file" --endpoint-url "$PHOTO_STORAGE_URL"

echo "$(date -u) files $file sent ($(du -sh "$mirror" | cut -f1))"
