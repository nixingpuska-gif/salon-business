# Backup & Restore Guide

## 🔐 Backup Strategy для 10,000 салонов

### Overview

Comprehensive backup solution с:
- Автоматические ежедневные backups
- Compression и encryption
- S3 storage для долгосрочного хранения
- Верификация backup integrity
- 30-дневная retention policy
- Быстрое восстановление

### Backup Schedule

- **Frequency**: Ежедневно в 2:00 AM
- **Retention**: 30 дней
- **Storage**: Local PVC + S3 (optional)
- **Compression**: gzip (уровень 9)
- **Encryption**: AES-256-CBC (optional)

## 🚀 Setup

### 1. Deploy Backup CronJob

```bash
# Apply backup CronJob
kubectl apply -f k8s/backup/backup-cronjob.yaml

# Verify
kubectl get cronjob -n production
kubectl get pvc -n production backup-pvc
```

### 2. Configure S3 (Optional)

```bash
# Create S3 bucket
aws s3 mb s3://salon-core-backups

# Create ConfigMap with S3 config
kubectl create configmap backup-config \
  --from-literal=s3-bucket=salon-core-backups \
  -n production

# Create AWS credentials secret
kubectl create secret generic aws-credentials \
  --from-literal=aws-access-key-id=YOUR_KEY \
  --from-literal=aws-secret-access-key=YOUR_SECRET \
  -n production
```

### 3. Test Backup

```bash
# Trigger manual backup
kubectl create job --from=cronjob/postgresql-backup manual-backup-$(date +%s) -n production

# Check logs
kubectl logs -n production -l app=postgresql-backup --tail=100
```

## 📦 Manual Backup

### Using Enhanced Script

```bash
# Basic backup
./scripts/backup/backup-postgresql-enhanced.sh

# With encryption
ENCRYPTION_KEY="your-secret-key" \
./scripts/backup/backup-postgresql-enhanced.sh

# With S3 upload
S3_BUCKET="salon-core-backups" \
ENCRYPTION_KEY="your-secret-key" \
./scripts/backup/backup-postgresql-enhanced.sh

# Custom retention
RETENTION_DAYS=60 \
./scripts/backup/backup-postgresql-enhanced.sh
```

### Backup Output

```
/backups/
├── backup_salon_core_20260128_020000.sql.gz.enc
├── backup_salon_core_20260127_020000.sql.gz.enc
└── backup_salon_core_20260126_020000.sql.gz.enc
```

## 🔄 Restore

### Full Restore

```bash
# 1. Find backup file
ls -lh /backups/

# 2. Run restore script
BACKUP_FILE=/backups/backup_salon_core_20260128_020000.sql.gz.enc \
ENCRYPTION_KEY="your-secret-key" \
./scripts/backup/restore-postgresql.sh

# 3. Verify
kubectl exec -n production postgresql-0 -- \
  psql -U salon -d salon_core -c "SELECT COUNT(*) FROM bookings;"
```

### Point-in-Time Recovery

```bash
# 1. Restore from backup
BACKUP_FILE=/backups/backup_salon_core_20260128_020000.sql.gz \
./scripts/backup/restore-postgresql.sh

# 2. Apply WAL logs (if available)
kubectl exec -n production postgresql-0 -- \
  pg_waldump /var/lib/postgresql/data/pg_wal/000000010000000000000001
```

## 📊 Monitoring

### Backup Metrics

Add to Prometheus:

```yaml
# Backup success/failure
backup_last_success_timestamp_seconds
backup_last_duration_seconds
backup_size_bytes
backup_failed_total
```

### Grafana Dashboard

Create dashboard with:
- Last successful backup time
- Backup size trend
- Backup duration
- Failed backups count
- Storage usage

### Alerts

```yaml
# Alert if no backup in 25 hours
- alert: BackupMissing
  expr: time() - backup_last_success_timestamp_seconds > 90000
  for: 1h
  annotations:
    summary: "No backup in 25 hours"

# Alert if backup failed
- alert: BackupFailed
  expr: increase(backup_failed_total[1h]) > 0
  annotations:
    summary: "Backup failed"
```

## 🔍 Verification

### Verify Backup Integrity

```bash
# Test gzip integrity
gzip -t /backups/backup_salon_core_20260128_020000.sql.gz

# Test encrypted backup
ENCRYPTION_KEY="your-key" \
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in /backups/backup_salon_core_20260128_020000.sql.gz.enc \
  -k "$ENCRYPTION_KEY" | gzip -t
```

### Test Restore (Staging)

```bash
# 1. Create test database
kubectl exec -n production postgresql-0 -- \
  psql -U salon -d postgres -c "CREATE DATABASE test_restore;"

# 2. Restore to test database
DATABASE=test_restore \
BACKUP_FILE=/backups/backup_salon_core_20260128_020000.sql.gz \
./scripts/backup/restore-postgresql.sh

# 3. Verify data
kubectl exec -n production postgresql-0 -- \
  psql -U salon -d test_restore -c "SELECT COUNT(*) FROM bookings;"

# 4. Cleanup
kubectl exec -n production postgresql-0 -- \
  psql -U salon -d postgres -c "DROP DATABASE test_restore;"
```

## 💾 Storage Requirements

### For 10,000 Salons

**Database Size Estimate:**
- Bookings: ~500GB (1M bookings/day × 30 days)
- Clients: ~50GB (500K clients)
- Salons: ~1GB (10K salons)
- Total: ~600GB

**Backup Size:**
- Compressed: ~150GB (25% compression ratio)
- Encrypted: ~150GB (minimal overhead)

**Storage Needed:**
- Local PVC: 1TB (30 days × 150GB × 2 safety factor)
- S3: Unlimited (with lifecycle policies)

### S3 Lifecycle Policy

```json
{
  "Rules": [
    {
      "Id": "MoveToGlacier",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 90,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

## 🚨 Disaster Recovery

### Scenario 1: Database Corruption

```bash
# 1. Stop application
kubectl scale deployment salon-core -n production --replicas=0

# 2. Restore from latest backup
BACKUP_FILE=/backups/backup_salon_core_latest.sql.gz \
./scripts/backup/restore-postgresql.sh

# 3. Verify data integrity
# Run data validation queries

# 4. Restart application
kubectl scale deployment salon-core -n production --replicas=20
```

### Scenario 2: Complete Data Loss

```bash
# 1. Recreate PostgreSQL cluster
helm install postgresql ./helm/postgresql -n production

# 2. Download backup from S3
aws s3 cp s3://salon-core-backups/backup_salon_core_20260128_020000.sql.gz.enc /backups/

# 3. Restore
BACKUP_FILE=/backups/backup_salon_core_20260128_020000.sql.gz.enc \
ENCRYPTION_KEY="your-key" \
./scripts/backup/restore-postgresql.sh

# 4. Verify and restart services
```

### RTO & RPO

- **RTO** (Recovery Time Objective): 30 minutes
- **RPO** (Recovery Point Objective): 24 hours (daily backups)

For better RPO, enable WAL archiving for point-in-time recovery.

## 🔧 Troubleshooting

### Backup Fails

```bash
# Check CronJob status
kubectl get cronjob -n production postgresql-backup
kubectl get jobs -n production | grep backup

# Check logs
kubectl logs -n production -l app=postgresql-backup

# Common issues:
# - Insufficient disk space
# - PostgreSQL connection issues
# - S3 credentials expired
```

### Restore Fails

```bash
# Check backup file integrity
gzip -t /backups/backup_file.sql.gz

# Check PostgreSQL logs
kubectl logs -n production postgresql-0

# Verify permissions
kubectl exec -n production postgresql-0 -- \
  psql -U salon -d postgres -c "SELECT current_user;"
```

## 📈 Best Practices

1. **Test Restores Regularly**
   - Monthly restore tests to staging
   - Verify data integrity
   - Measure restore time

2. **Monitor Backup Health**
   - Set up alerts for failed backups
   - Track backup size trends
   - Monitor storage usage

3. **Secure Backups**
   - Always encrypt backups
   - Rotate encryption keys annually
   - Restrict S3 bucket access

4. **Document Procedures**
   - Keep runbook updated
   - Document restore procedures
   - Train team on DR process

5. **Offsite Storage**
   - Use S3 for offsite backups
   - Enable versioning
   - Use lifecycle policies
