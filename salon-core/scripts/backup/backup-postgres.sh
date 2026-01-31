#!/bin/bash
# PostgreSQL Backup Script for salon-core
# Run this script via cron: 0 */6 * * * /path/to/backup-postgres.sh

set -e

# Configuration
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="salon_core_${TIMESTAMP}.sql.gz"

# Database credentials (from environment or .env)
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-salon_core}"
DB_USER="${POSTGRES_USER:-salon}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of $DB_NAME..."

# Perform backup
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"

    # Upload to S3 (optional)
    if [ -n "$AWS_S3_BUCKET" ]; then
        aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/postgres/"
        echo "[$(date)] Backup uploaded to S3"
    fi
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi

# Clean up old backups
echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "salon_core_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup process completed"
