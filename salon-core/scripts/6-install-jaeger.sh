#!/bin/bash
set -e

# Script to install Jaeger for distributed tracing

echo "=== Installing Jaeger for Distributed Tracing ==="
echo ""

# Configuration
NAMESPACE="${NAMESPACE:-tracing}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo "Error: kubectl is not installed"
  exit 1
fi

echo "Installing Jaeger..."
echo "  Namespace: $NAMESPACE"
echo ""

# Apply Jaeger manifests
echo "Applying Jaeger deployment..."
kubectl apply -f ./k8s/tracing/jaeger-deployment.yaml
kubectl apply -f ./k8s/tracing/jaeger-service.yaml

echo ""
echo "Waiting for Jaeger to be ready..."
kubectl wait --namespace "$NAMESPACE" \
  --for=condition=ready pod \
  --selector=app=jaeger \
  --timeout=300s

echo ""
echo "✅ Jaeger installed successfully!"

# Verify installation
echo ""
echo "Verifying installation..."
kubectl get pods -n "$NAMESPACE"
kubectl get svc -n "$NAMESPACE"

echo ""
echo "=========================================="
echo "✅ Jaeger Setup Complete!"
echo "=========================================="
echo ""
echo "Access Jaeger UI:"
echo "  kubectl port-forward -n $NAMESPACE svc/jaeger-query 16686:16686"
echo "  URL: http://localhost:16686"
echo ""
echo "Collector endpoints:"
echo "  HTTP: jaeger-collector.$NAMESPACE.svc.cluster.local:14268"
echo "  gRPC: jaeger-collector.$NAMESPACE.svc.cluster.local:14250"
echo "  OTLP gRPC: jaeger-collector.$NAMESPACE.svc.cluster.local:4317"
echo "  OTLP HTTP: jaeger-collector.$NAMESPACE.svc.cluster.local:4318"
echo ""
echo "Next: Integrate tracing in your application"
echo "See: TRACING-INTEGRATION-GUIDE.md"
