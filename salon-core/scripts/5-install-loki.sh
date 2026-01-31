#!/bin/bash
set -e

# Script to install Loki stack for log aggregation

echo "=== Installing Loki Stack for Log Aggregation ==="
echo ""

# Configuration
NAMESPACE="${NAMESPACE:-monitoring}"
LOKI_VERSION="${LOKI_VERSION:-2.9.3}"

# Check if helm is available
if ! command -v helm &> /dev/null; then
  echo "Error: helm is not installed"
  exit 1
fi

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo "Error: kubectl is not installed"
  exit 1
fi

echo "Installing Loki stack..."
echo "  Namespace: $NAMESPACE"
echo "  Version: $LOKI_VERSION"
echo ""

# Add Grafana Helm repo
echo "Adding Grafana Helm repository..."
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Loki stack
echo ""
echo "Installing Loki + Promtail..."
helm upgrade --install loki grafana/loki-stack \
  --namespace "$NAMESPACE" \
  --version "$LOKI_VERSION" \
  --values ./helm/loki-stack/values.yaml \
  --wait \
  --timeout 10m

echo ""
echo "✅ Loki stack installed successfully!"

# Verify installation
echo ""
echo "Verifying installation..."
kubectl get pods -n "$NAMESPACE" | grep loki
kubectl get pods -n "$NAMESPACE" | grep promtail

# Configure Grafana datasource
echo ""
echo "Configuring Grafana datasource..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-datasource
  namespace: $NAMESPACE
  labels:
    grafana_datasource: "1"
data:
  loki-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        access: proxy
        url: http://loki:3100
        isDefault: false
        editable: true
        jsonData:
          maxLines: 1000
EOF

echo ""
echo "✅ Grafana datasource configured!"

# Restart Grafana to pick up new datasource
echo ""
echo "Restarting Grafana..."
kubectl rollout restart deployment/prometheus-grafana -n "$NAMESPACE"
kubectl rollout status deployment/prometheus-grafana -n "$NAMESPACE"

echo ""
echo "=========================================="
echo "✅ Loki Stack Setup Complete!"
echo "=========================================="
echo ""
echo "Access Grafana:"
echo "  kubectl port-forward -n $NAMESPACE svc/prometheus-grafana 3000:80"
echo "  URL: http://localhost:3000"
echo ""
echo "Query logs in Grafana:"
echo "  Explore → Select 'Loki' datasource"
echo ""
echo "Example queries:"
echo "  {namespace=\"production\", app=\"salon-core\"}"
echo "  {namespace=\"production\"} |= \"error\""
echo "  {pod=~\"salon-core-.*\"} |= \"booking\""
echo ""
echo "Next: Import log dashboard from monitoring/grafana-dashboards/logs.json"
