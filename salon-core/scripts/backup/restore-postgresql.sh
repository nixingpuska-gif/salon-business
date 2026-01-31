#!/bin/bash
set -e

# PostgreSQL Restore Script
# Restores database from backup file

echo "=== PostgreSQL Restore Script ==="
echo "Started at: $(date)"
echo ""

# Configuration
NAMESPACE="${NAMESPACE:-production}"
POD_NAME="${POD_NAME:-postgresql-0}"
DATABASE="${DATABASE:-salon_core}"
BACKUP_FILE="${BACKUP_FILE:-}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

# Validate parameters
if [ -z "$BACKUP_FILE" ]; then
  echo "Error: BACKUP_FILE is required"
  echo "Usage: BACKUP_FILE=/path/to/backup.sql.gz ./restore-postgresql.sh"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Configuration:"
echo "  Namespace: $NAMESPACE"
echo "  Pod: $POD_NAME"
echo "  Database: $DATABASE"
echo "  Backup file: $BACKUP_FILE"
echo ""

# Warning
echo "⚠️  WARNING: This will REPLACE the existing database!"
echo "⚠️  Make sure you have a recent backup before proceeding."
echo ""
read -p "Type 'yes' to continue: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# Prepare backup file
TEMP_DIR=$(mktemp -d)
RESTORE_FILE="$TEMP_DIR/restore.sql"

echo ""
echo "Step 1/4: Preparing backup file..."

# Check if encrypted
if [[ "$BACKUP_FILE" == *.enc ]]; then
  if [ -z "$ENCRYPTION_KEY" ]; then
    echo "Error: Backup is encrypted but no ENCRYPTION_KEY provided"
    exit 1
  fi
  echo "Decrypting backup..."
  openssl enc -aes-256-cbc -d -pbkdf2 \
    -in "$BACKUP_FILE" \
    -k "$ENCRYPTION_KEY" | gunzip > "$RESTORE_FILE"
elif [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Decompressing backup..."
  gunzip -c "$BACKUP_FILE" > "$RESTORE_FILE"
else
  cp "$BACKUP_FILE" "$RESTORE_FILE"
fi

echo "✅ Backup file prepared"

# Step 2: Terminate connections
echo ""
echo "Step 2/4: Terminating active connections..."
kubectl exec -n "$NAMESPACE" "$POD_NAME" -- psql -U salon -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DATABASE' AND pid <> pg_backend_pid();"
echo "✅ Connections terminated"

# Step 3: Drop and recreate database
echo ""
echo "Step 3/4: Recreating database..."
kubectl exec -n "$NAMESPACE" "$POD_NAME" -- psql -U salon -d postgres -c "DROP DATABASE IF EXISTS $DATABASE;"
kubectl exec -n "$NAMESPACE" "$POD_NAME" -- psql -U salon -d postgres -c "CREATE DATABASE $DATABASE OWNER salon;"
echo "✅ Database recreated"

# Step 4: Restore backup
echo ""
echo "Step 4/4: Restoring backup..."
cat "$RESTORE_FILE" | kubectl exec -i -n "$NAMESPACE" "$POD_NAME" -- \
  pg_restore -U salon -d "$DATABASE" -v

echo "✅ Backup restored"

# Cleanup
rm -rf "$TEMP_DIR"

# Verify
echo ""
echo "Verifying restore..."
TABLE_COUNT=$(kubectl exec -n "$NAMESPACE" "$POD_NAME" -- psql -U salon -d "$DATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables restored: $TABLE_COUNT"

echo ""
echo "=========================================="
echo "✅ Restore Complete!"
echo "=========================================="
echo "Database: $DATABASE"
echo "Completed at: $(date)"
