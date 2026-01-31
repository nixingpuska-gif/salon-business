#!/bin/bash
set -e

# Enhanced PostgreSQL Backup Script
# Features: Compression, Encryption, S3 Upload, Verification, Rotation

echo "=== PostgreSQL Backup Script ==="
echo "Started at: $(date)"
echo ""

# Configuration
NAMESPACE="${NAMESPACE:-production}"
POD_NAME="${POD_NAME:-postgresql-0}"
DATABASE="${DATABASE:-salon_core}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATABASE}_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
ENCRYPTED_FILE="${COMPRESSED_FILE}.enc"

echo "Configuration:"
echo "  Namespace: $NAMESPACE"
echo "  Pod: $POD_NAME"
echo "  Database: $DATABASE"
echo "  Backup dir: $BACKUP_DIR"
echo "  Retention: $RETENTION_DAYS days"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Create backup
echo "Step 1/6: Creating backup..."
kubectl exec -n "$NAMESPACE" "$POD_NAME" -- \
  pg_dump -U salon -d "$DATABASE" -F c -b -v \
  > "$BACKUP_DIR/$BACKUP_FILE" 2>&1

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "✅ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Step 2: Compress backup
echo ""
echo "Step 2/6: Compressing backup..."
gzip -9 "$BACKUP_DIR/$BACKUP_FILE"
COMPRESSED_SIZE=$(du -h "$BACKUP_DIR/$COMPRESSED_FILE" | cut -f1)
echo "✅ Backup compressed: $COMPRESSED_FILE ($COMPRESSED_SIZE)"

# Step 3: Encrypt backup (if key provided)
FINAL_FILE="$COMPRESSED_FILE"
if [ -n "$ENCRYPTION_KEY" ]; then
  echo ""
  echo "Step 3/6: Encrypting backup..."
  openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$BACKUP_DIR/$COMPRESSED_FILE" \
    -out "$BACKUP_DIR/$ENCRYPTED_FILE" \
    -k "$ENCRYPTION_KEY"
  rm "$BACKUP_DIR/$COMPRESSED_FILE"
  FINAL_FILE="$ENCRYPTED_FILE"
  echo "✅ Backup encrypted: $ENCRYPTED_FILE"
else
  echo ""
  echo "Step 3/6: Skipping encryption (no key provided)"
fi

# Step 4: Verify backup
echo ""
echo "Step 4/6: Verifying backup integrity..."
if [ "$FINAL_FILE" = "$ENCRYPTED_FILE" ]; then
  # Decrypt and verify
  openssl enc -aes-256-cbc -d -pbkdf2 \
    -in "$BACKUP_DIR/$FINAL_FILE" \
    -k "$ENCRYPTION_KEY" | gzip -t
else
  # Just verify gzip
  gzip -t "$BACKUP_DIR/$FINAL_FILE"
fi
echo "✅ Backup verified successfully"

# Step 5: Upload to S3 (if configured)
if [ -n "$S3_BUCKET" ]; then
  echo ""
  echo "Step 5/6: Uploading to S3..."
  aws s3 cp "$BACKUP_DIR/$FINAL_FILE" \
    "s3://$S3_BUCKET/postgresql-backups/$FINAL_FILE" \
    --storage-class STANDARD_IA
  echo "✅ Backup uploaded to S3: s3://$S3_BUCKET/postgresql-backups/$FINAL_FILE"
else
  echo ""
  echo "Step 5/6: Skipping S3 upload (no bucket configured)"
fi

# Step 6: Cleanup old backups
echo ""
echo "Step 6/6: Cleaning up old backups..."
find "$BACKUP_DIR" -name "backup_${DATABASE}_*.sql.gz*" -mtime +$RETENTION_DAYS -delete
REMAINING=$(find "$BACKUP_DIR" -name "backup_${DATABASE}_*.sql.gz*" | wc -l)
echo "✅ Cleanup complete. Remaining backups: $REMAINING"

# Summary
echo ""
echo "=========================================="
echo "✅ Backup Complete!"
echo "=========================================="
echo "File: $BACKUP_DIR/$FINAL_FILE"
echo "Size: $(du -h "$BACKUP_DIR/$FINAL_FILE" | cut -f1)"
echo "Completed at: $(date)"
