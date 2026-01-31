#!/bin/bash
set -e

# Script to generate all secrets for salon-core production deployment

echo "=== Salon Core - Secrets Generation ==="
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
  echo "Error: openssl is not installed"
  exit 1
fi

# Configuration
SECRETS_DIR="${SECRETS_DIR:-./secrets}"
NAMESPACE="${NAMESPACE:-production}"

# Create secrets directory
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

echo "Generating secrets in: $SECRETS_DIR"
echo ""

# Function to generate random string
generate_secret() {
  openssl rand -hex 32
}

# Function to generate password
generate_password() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

echo "=========================================="
echo "Generating secrets..."
echo "=========================================="
echo ""

# 1. Admin API Token
echo "1/10 Generating ADMIN_API_TOKEN..."
ADMIN_API_TOKEN=$(generate_secret)
echo "✅ ADMIN_API_TOKEN generated"

# 2. Encryption Secret
echo "2/10 Generating ENCRYPTION_SECRET..."
ENCRYPTION_SECRET=$(generate_secret)
echo "✅ ENCRYPTION_SECRET generated"

# 3. PostgreSQL passwords
echo "3/10 Generating PostgreSQL passwords..."
POSTGRES_PASSWORD=$(generate_password)
POSTGRES_USER_PASSWORD=$(generate_password)
echo "✅ PostgreSQL passwords generated"

# 4. Redis password
echo "4/10 Generating Redis password..."
REDIS_PASSWORD=$(generate_password)
echo "✅ Redis password generated"

# 5. Webhook secrets
echo "5/10 Generating webhook secrets..."
TELEGRAM_WEBHOOK_SECRET=$(generate_secret)
WHATSAPP_WEBHOOK_SECRET=$(generate_secret)
CALCOM_WEBHOOK_SECRET=$(generate_secret)
echo "✅ Webhook secrets generated"

# 6. JWT secrets
echo "6/10 Generating JWT secrets..."
JWT_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)
echo "✅ JWT secrets generated"

# 7. Session secret
echo "7/10 Generating session secret..."
SESSION_SECRET=$(generate_secret)
echo "✅ Session secret generated"

# 8. Database URL
echo "8/10 Generating DATABASE_URL..."
DATABASE_URL="postgresql://salon:${POSTGRES_USER_PASSWORD}@postgresql-master.${NAMESPACE}.svc.cluster.local:5432/salon_core"
DATABASE_READ_URL="postgresql://salon:${POSTGRES_USER_PASSWORD}@postgresql-read.${NAMESPACE}.svc.cluster.local:5432/salon_core"
echo "✅ DATABASE_URL generated"

# 9. Redis URL
echo "9/10 Generating REDIS_URL..."
REDIS_URL="redis://:${REDIS_PASSWORD}@redis-cluster.${NAMESPACE}.svc.cluster.local:6379"
echo "✅ REDIS_URL generated"

# 10. Save to files
echo "10/10 Saving secrets to files..."

# Save as .env file
cat > "$SECRETS_DIR/secrets.env" <<EOF
# Generated on $(date)
# DO NOT COMMIT THIS FILE TO GIT!

# Admin API
ADMIN_API_TOKEN=${ADMIN_API_TOKEN}

# Encryption
ENCRYPTION_SECRET=${ENCRYPTION_SECRET}

# Database
DATABASE_URL=${DATABASE_URL}
DATABASE_READ_URL=${DATABASE_READ_URL}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_USER_PASSWORD=${POSTGRES_USER_PASSWORD}

# Redis
REDIS_URL=${REDIS_URL}
REDIS_PASSWORD=${REDIS_PASSWORD}

# Webhooks
TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}
WHATSAPP_WEBHOOK_SECRET=${WHATSAPP_WEBHOOK_SECRET}
CALCOM_WEBHOOK_SECRET=${CALCOM_WEBHOOK_SECRET}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Session
SESSION_SECRET=${SESSION_SECRET}
EOF

chmod 600 "$SECRETS_DIR/secrets.env"
echo "✅ Saved to: $SECRETS_DIR/secrets.env"

# Save PostgreSQL values
cat > "$SECRETS_DIR/postgresql-values.yaml" <<EOF
# PostgreSQL Helm values with secrets
# Generated on $(date)

auth:
  postgresPassword: "${POSTGRES_PASSWORD}"
  username: "salon"
  password: "${POSTGRES_USER_PASSWORD}"
  database: "salon_core"
EOF

chmod 600 "$SECRETS_DIR/postgresql-values.yaml"
echo "✅ Saved to: $SECRETS_DIR/postgresql-values.yaml"

# Save Redis values
cat > "$SECRETS_DIR/redis-values.yaml" <<EOF
# Redis Helm values with secrets
# Generated on $(date)

auth:
  enabled: true
  password: "${REDIS_PASSWORD}"
EOF

chmod 600 "$SECRETS_DIR/redis-values.yaml"
echo "✅ Saved to: $SECRETS_DIR/redis-values.yaml"

# Save salon-core values
cat > "$SECRETS_DIR/salon-core-values.yaml" <<EOF
# Salon Core Helm values with secrets
# Generated on $(date)

secrets:
  adminApiToken: "${ADMIN_API_TOKEN}"
  databaseUrl: "${DATABASE_URL}"
  redisUrl: "${REDIS_URL}"
  encryptionSecret: "${ENCRYPTION_SECRET}"
  telegramWebhookSecret: "${TELEGRAM_WEBHOOK_SECRET}"
  whatsappWebhookSecret: "${WHATSAPP_WEBHOOK_SECRET}"
  calcomWebhookSecret: "${CALCOM_WEBHOOK_SECRET}"

env:
  - name: NODE_ENV
    value: "production"
  - name: PORT
    value: "3000"
  - name: LOG_LEVEL
    value: "info"
  - name: JWT_SECRET
    value: "${JWT_SECRET}"
  - name: JWT_REFRESH_SECRET
    value: "${JWT_REFRESH_SECRET}"
  - name: SESSION_SECRET
    value: "${SESSION_SECRET}"
EOF

chmod 600 "$SECRETS_DIR/salon-core-values.yaml"
echo "✅ Saved to: $SECRETS_DIR/salon-core-values.yaml"

# Create Kubernetes secrets
echo ""
echo "=========================================="
echo "Creating Kubernetes secrets..."
echo "=========================================="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo "⚠️  kubectl not found, skipping Kubernetes secrets creation"
  echo "   You can create them manually later with:"
  echo "   kubectl create secret generic salon-secrets --from-env-file=$SECRETS_DIR/secrets.env -n $NAMESPACE"
else
  # Check if namespace exists
  if kubectl get namespace "$NAMESPACE" &> /dev/null; then
    echo "Creating secrets in namespace: $NAMESPACE"

    # Create generic secret from env file
    kubectl create secret generic salon-secrets \
      --from-env-file="$SECRETS_DIR/secrets.env" \
      --namespace="$NAMESPACE" \
      --dry-run=client -o yaml | kubectl apply -f -

    echo "✅ Kubernetes secret 'salon-secrets' created in namespace '$NAMESPACE'"
  else
    echo "⚠️  Namespace '$NAMESPACE' not found"
    echo "   Create it first: kubectl create namespace $NAMESPACE"
    echo "   Then run: kubectl create secret generic salon-secrets --from-env-file=$SECRETS_DIR/secrets.env -n $NAMESPACE"
  fi
fi

echo ""
echo "=========================================="
echo "✅ All secrets generated successfully!"
echo "=========================================="
echo ""
echo "Secrets saved to:"
echo "  - $SECRETS_DIR/secrets.env"
echo "  - $SECRETS_DIR/postgresql-values.yaml"
echo "  - $SECRETS_DIR/redis-values.yaml"
echo "  - $SECRETS_DIR/salon-core-values.yaml"
echo ""
echo "⚠️  IMPORTANT: Keep these files secure!"
echo "  - DO NOT commit to git"
echo "  - Store in secure location (1Password, Vault, etc.)"
echo "  - Restrict file permissions (already set to 600)"
echo ""
echo "Database URLs:"
echo "  Write: $DATABASE_URL"
echo "  Read:  $DATABASE_READ_URL"
echo ""
echo "Redis URL:"
echo "  $REDIS_URL"
echo ""
echo "Next steps:"
echo "1. Review generated secrets in $SECRETS_DIR/"
echo "2. Store secrets in secure location"
echo "3. Run: ./4-deploy-all.sh"
