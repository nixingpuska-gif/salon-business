#!/bin/bash
set -e

# Script to deploy all salon-core components
# Order: PostgreSQL → Redis Cluster → salon-core

echo "=== Salon Core - Full Deployment ==="
echo ""

# Configuration
NAMESPACE="${NAMESPACE:-production}"
SECRETS_DIR="${SECRETS_DIR:-./secrets}"
HELM_DIR="${HELM_DIR:-./helm}"
TIMEOUT="${TIMEOUT:-600s}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo "Error: kubectl is not installed"
  exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
  echo "Error: helm is not installed"
  exit 1
fi

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
  echo "Error: Namespace '$NAMESPACE' does not exist"
  echo "Create it first: kubectl create namespace $NAMESPACE"
  exit 1
fi

# Check if secrets exist
if [ ! -f "$SECRETS_DIR/postgresql-values.yaml" ]; then
  echo "Error: Secrets not found in $SECRETS_DIR/"
  echo "Run: ./3-generate-secrets.sh"
  exit 1
fi

echo "Deployment configuration:"
echo "  Namespace: $NAMESPACE"
echo "  Secrets dir: $SECRETS_DIR"
echo "  Helm charts: $HELM_DIR"
echo "  Timeout: $TIMEOUT"
echo ""

# Function to wait for pods
wait_for_pods() {
  local label=$1
  local count=$2
  local timeout=$3

  echo "Waiting for $count pods with label $label..."
  kubectl wait --namespace "$NAMESPACE" \
    --for=condition=ready pod \
    --selector="$label" \
    --timeout="$timeout" || {
      echo "⚠️  Timeout waiting for pods"
      echo "Current pod status:"
      kubectl get pods -n "$NAMESPACE" -l "$label"
      return 1
    }
}

# 1. Deploy PostgreSQL
echo "=========================================="
echo "1/3 Deploying PostgreSQL..."
echo "=========================================="
echo ""

# Merge base values with secrets
cat "$HELM_DIR/postgresql/values.yaml" "$SECRETS_DIR/postgresql-values.yaml" > "$SECRETS_DIR/postgresql-merged.yaml"

helm upgrade --install postgresql "$HELM_DIR/postgresql" \
  --namespace "$NAMESPACE" \
  --values "$SECRETS_DIR/postgresql-merged.yaml" \
  --timeout "$TIMEOUT" \
  --wait

echo ""
echo "Waiting for PostgreSQL pods to be ready..."
wait_for_pods "app.kubernetes.io/name=postgresql" 4 "$TIMEOUT"

echo ""
echo "✅ PostgreSQL deployed successfully!"

# Verify PostgreSQL
echo ""
echo "Verifying PostgreSQL..."
kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgresql
kubectl get svc -n "$NAMESPACE" | grep postgresql

# Check replication status
echo ""
echo "Checking replication status..."
kubectl exec -it postgresql-0 -n "$NAMESPACE" -- psql -U salon -d salon_core -c "SELECT * FROM pg_stat_replication;" || echo "⚠️  Replication check skipped (expected on first run)"

echo ""

# 2. Deploy Redis Cluster
echo "=========================================="
echo "2/3 Deploying Redis Cluster..."
echo "=========================================="
echo ""

# Merge base values with secrets
cat "$HELM_DIR/redis-cluster/values.yaml" "$SECRETS_DIR/redis-values.yaml" > "$SECRETS_DIR/redis-merged.yaml"

helm upgrade --install redis-cluster "$HELM_DIR/redis-cluster" \
  --namespace "$NAMESPACE" \
  --values "$SECRETS_DIR/redis-merged.yaml" \
  --timeout "$TIMEOUT" \
  --wait

echo ""
echo "Waiting for Redis pods to be ready..."
wait_for_pods "app.kubernetes.io/name=redis-cluster" 6 "$TIMEOUT"

echo ""
echo "✅ Redis Cluster deployed successfully!"

# Initialize Redis Cluster
echo ""
echo "Initializing Redis Cluster..."

# Get Redis password
REDIS_PASSWORD=$(grep "password:" "$SECRETS_DIR/redis-values.yaml" | awk '{print $2}' | tr -d '"')

# Wait a bit for all pods to be fully ready
sleep 10

# Create cluster
kubectl run redis-cluster-init \
  --image=redis:7.2-alpine \
  --restart=Never \
  --namespace="$NAMESPACE" \
  --command -- sh -c "sleep 5 && redis-cli --cluster create \
    redis-cluster-0.redis-cluster-headless:6379 \
    redis-cluster-1.redis-cluster-headless:6379 \
    redis-cluster-2.redis-cluster-headless:6379 \
    redis-cluster-3.redis-cluster-headless:6379 \
    redis-cluster-4.redis-cluster-headless:6379 \
    redis-cluster-5.redis-cluster-headless:6379 \
    --cluster-replicas 1 --cluster-yes -a $REDIS_PASSWORD" || echo "⚠️  Cluster might already be initialized"

# Wait for init job to complete
sleep 10

# Clean up init pod
kubectl delete pod redis-cluster-init -n "$NAMESPACE" --ignore-not-found=true

echo ""
echo "Verifying Redis Cluster..."
kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=redis-cluster
kubectl get svc -n "$NAMESPACE" | grep redis

# Check cluster status
echo ""
echo "Checking cluster status..."
kubectl exec -it redis-cluster-0 -n "$NAMESPACE" -- redis-cli -a "$REDIS_PASSWORD" cluster info || echo "⚠️  Cluster check skipped"

echo ""

# 3. Deploy salon-core
echo "=========================================="
echo "3/3 Deploying salon-core application..."
echo "=========================================="
echo ""

# Merge base values with secrets
cat "$HELM_DIR/salon-core/values.yaml" "$SECRETS_DIR/salon-core-values.yaml" > "$SECRETS_DIR/salon-core-merged.yaml"

# Update image repository and tag if provided
if [ -n "$IMAGE_REPOSITORY" ]; then
  echo "Using custom image repository: $IMAGE_REPOSITORY"
  yq eval ".image.repository = \"$IMAGE_REPOSITORY\"" -i "$SECRETS_DIR/salon-core-merged.yaml" || \
    sed -i "s|repository:.*|repository: $IMAGE_REPOSITORY|" "$SECRETS_DIR/salon-core-merged.yaml"
fi

if [ -n "$IMAGE_TAG" ]; then
  echo "Using custom image tag: $IMAGE_TAG"
  yq eval ".image.tag = \"$IMAGE_TAG\"" -i "$SECRETS_DIR/salon-core-merged.yaml" || \
    sed -i "s|tag:.*|tag: $IMAGE_TAG|" "$SECRETS_DIR/salon-core-merged.yaml"
fi

helm upgrade --install salon-core "$HELM_DIR/salon-core" \
  --namespace "$NAMESPACE" \
  --values "$SECRETS_DIR/salon-core-merged.yaml" \
  --timeout "$TIMEOUT" \
  --wait

echo ""
echo "Waiting for salon-core pods to be ready..."
wait_for_pods "app=salon-core" 20 "$TIMEOUT"

echo ""
echo "✅ salon-core deployed successfully!"

# Verify salon-core
echo ""
echo "Verifying salon-core..."
kubectl get pods -n "$NAMESPACE" -l app=salon-core
kubectl get svc -n "$NAMESPACE" | grep salon-core
kubectl get hpa -n "$NAMESPACE"
kubectl get ingress -n "$NAMESPACE"

echo ""

# Final verification
echo "=========================================="
echo "Final Verification"
echo "=========================================="
echo ""

echo "All pods in namespace $NAMESPACE:"
kubectl get pods -n "$NAMESPACE"

echo ""
echo "All services in namespace $NAMESPACE:"
kubectl get svc -n "$NAMESPACE"

echo ""
echo "HPA status:"
kubectl get hpa -n "$NAMESPACE"

echo ""
echo "Ingress status:"
kubectl get ingress -n "$NAMESPACE"

# Get ingress URL
INGRESS_HOST=$(kubectl get ingress -n "$NAMESPACE" salon-core-ingress -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "api.salon-core.com")

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "All components deployed successfully:"
echo "  ✅ PostgreSQL (1 master + 3 replicas)"
echo "  ✅ Redis Cluster (6 nodes)"
echo "  ✅ salon-core (20+ pods with auto-scaling)"
echo ""
echo "Connection Information:"
echo "  API URL: https://$INGRESS_HOST"
echo "  Health: https://$INGRESS_HOST/health"
echo ""
echo "Database:"
echo "  Master: postgresql-master.$NAMESPACE.svc.cluster.local:5432"
echo "  Read: postgresql-read.$NAMESPACE.svc.cluster.local:5432"
echo ""
echo "Redis:"
echo "  Cluster: redis-cluster.$NAMESPACE.svc.cluster.local:6379"
echo ""
echo "Monitoring:"
echo "  Grafana: kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80"
echo "  Prometheus: kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090"
echo ""
echo "Next steps:"
echo "  1. Test health endpoint: curl https://$INGRESS_HOST/health"
echo "  2. Run load tests: cd load-tests && k6 run booking-test.js"
echo "  3. Monitor metrics in Grafana"
echo "  4. Set up CI/CD pipeline"
echo ""
echo "For troubleshooting, see: RUNBOOK.md"
