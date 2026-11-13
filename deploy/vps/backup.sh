#!/bin/sh
# Daily backup: pg_dump (custom format) + tar of ./data -> S3-compatible bucket (AWS S3 / Cloudflare R2).
# Config in /etc/jollykite-backup.env (chmod 600), never in git:
#   S3_BUCKET=miko-pg-backups  S3_PREFIX=pnp-vps  AWS_ACCESS_KEY_ID=...  AWS_SECRET_ACCESS_KEY=...
#   AWS_DEFAULT_REGION=eu-central-1   S3_ENDPOINT=   (set for R2: https://<account>.r2.cloudflarestorage.com)
# Cron: 17 2 * * * root /opt/jollykite/deploy/vps/backup.sh >>/var/log/jollykite-backup.log 2>&1
# Retention: S3 lifecycle rule on prefix pnp-vps/ (expire after 30 days); locally only the last 3 are kept.
set -eu
set -a; . /etc/jollykite-backup.env; set +a
cd "$(dirname "$0")"

TS=$(date +%Y%m%d-%H%M%S)
OUT=/var/backups/jollykite
mkdir -p "$OUT"

docker compose exec -T postgres pg_dump -U jollykite -Fc jollykite > "$OUT/pg-$TS.dump"
tar -czf "$OUT/data-$TS.tgz" -C . data

EP=""
[ -n "${S3_ENDPOINT:-}" ] && EP="--endpoint-url $S3_ENDPOINT"
for f in "$OUT/pg-$TS.dump" "$OUT/data-$TS.tgz"; do
  # shellcheck disable=SC2086
  aws $EP s3 cp "$f" "s3://$S3_BUCKET/${S3_PREFIX:-pnp-vps}/$(basename "$f")" --only-show-errors
done

# keep the last 3 local copies of each kind
for p in pg data; do
  ls -1t "$OUT"/$p-* 2>/dev/null | tail -n +4 | xargs -r rm -f
done
echo "$(date -Is) backup ok: $TS"
