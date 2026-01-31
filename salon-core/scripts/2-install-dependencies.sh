#!/bin/bash
set -e

# Script to install Kubernetes dependencies for salon-core
# Installs: nginx-ingress, cert-manager, prometheus

echo "=== Salon Core - Dependencies Installation ==="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo "Error: kubectl is not installed"
  exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
  echo "Error: helm is not installed"
  echo "Install: https://helm.sh/docs/intro/install/"
  exit 1
fi

# Configuration
NGINX_VERSION="${NGINX_VERSION:-4.8.3}"
CERT_MANAGER_VERSION="${CERT_MANAGER_VERSION:-v1.13.0}"
PROMETHEUS_VERSION="${PROMETHEUS_VERSION:-51.0.0}"

echo "Installing dependencies..."
echo "- nginx-ingress: $NGINX_VERSION"
echo "- cert-manager: $CERT_MANAGER_VERSION"
echo "- prometheus: $PROMETHEUS_VERSION"
echo ""

# 1. Install nginx-ingress
echo "=========================================="
echo "1/3 Installing nginx-ingress..."
echo "=========================================="

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

kubectl create namespace ingress-nginx --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --version "$NGINX_VERSION" \
  --set controller.replicaCount=3 \
  --set controller.resources.requests.cpu=200m \
  --set controller.resources.requests.memory=256Mi \
  --set controller.resources.limits.cpu=500m \
  --set controller.resources.limits.memory=512Mi \
  --set controller.metrics.enabled=true \
  --set controller.podAnnotations."prometheus\.io/scrape"=true \
  --set controller.podAnnotations."prometheus\.io/port"=10254 \
  --wait

echo ""
echo "✅ nginx-ingress installed!"

# Wait for LoadBalancer IP
echo ""
echo "Waiting for LoadBalancer IP..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

INGRESS_IP=$(kubectl get svc -n ingress-nginx nginx-ingress-ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$INGRESS_IP" ]; then
  INGRESS_IP=$(kubectl get svc -n ingress-nginx nginx-ingress-ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
fi

echo ""
echo "Ingress LoadBalancer: $INGRESS_IP"
echo "⚠️  Configure DNS: api.salon-core.com -> $INGRESS_IP"

# 2. Install cert-manager
echo ""
echo "=========================================="
echo "2/3 Installing cert-manager..."
echo "=========================================="

kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/$CERT_MANAGER_VERSION/cert-manager.yaml

echo ""
echo "Waiting for cert-manager to be ready..."
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=120s

echo ""
echo "✅ cert-manager installed!"

# Create ClusterIssuer for Let's Encrypt
echo ""
echo "Creating Let's Encrypt ClusterIssuer..."

cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@salon-core.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

echo "✅ ClusterIssuer created!"

# 3. Install Prometheus
echo ""
echo "=========================================="
echo "3/3 Installing Prometheus..."
echo "=========================================="

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --version "$PROMETHEUS_VERSION" \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi \
  --set grafana.adminPassword=admin \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.size=10Gi \
  --wait

echo ""
echo "✅ Prometheus installed!"

# Verify installations
echo ""
echo "=========================================="
echo "Verifying installations..."
echo "=========================================="

echo ""
echo "nginx-ingress pods:"
kubectl get pods -n ingress-nginx

echo ""
echo "cert-manager pods:"
kubectl get pods -n cert-manager

echo ""
echo "prometheus pods:"
kubectl get pods -n monitoring

echo ""
echo "=========================================="
echo "✅ All dependencies installed successfully!"
echo "=========================================="
echo ""
echo "Access Grafana:"
echo "  kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80"
echo "  URL: http://localhost:3000"
echo "  User: admin"
echo "  Password: admin"
echo ""
echo "Access Prometheus:"
echo "  kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090"
echo "  URL: http://localhost:9090"
echo ""
echo "Ingress LoadBalancer: $INGRESS_IP"
echo "⚠️  Update DNS: api.salon-core.com -> $INGRESS_IP"
echo ""
echo "Next steps:"
echo "1. Configure DNS for your domain"
echo "2. Run: ./3-generate-secrets.sh"
echo "3. Deploy components: ./4-deploy-all.sh"
