#!/bin/bash
set -e

# Script to create Kubernetes cluster for salon-core production
# Supports AWS EKS, GCP GKE, and Azure AKS

echo "=== Salon Core - Cluster Creation Script ==="
echo ""

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-salon-core-prod}"
REGION="${REGION:-us-east-1}"
NODE_TYPE="${NODE_TYPE:-m5.2xlarge}"
MIN_NODES="${MIN_NODES:-10}"
MAX_NODES="${MAX_NODES:-20}"
DESIRED_NODES="${DESIRED_NODES:-15}"

# Detect cloud provider
if [ -z "$CLOUD_PROVIDER" ]; then
  echo "Please specify CLOUD_PROVIDER: aws, gcp, or azure"
  echo "Example: CLOUD_PROVIDER=aws ./1-create-cluster.sh"
  exit 1
fi

case $CLOUD_PROVIDER in
  aws)
    echo "Creating EKS cluster on AWS..."
    echo "Cluster name: $CLUSTER_NAME"
    echo "Region: $REGION"
    echo "Node type: $NODE_TYPE"
    echo "Nodes: $MIN_NODES-$MAX_NODES (desired: $DESIRED_NODES)"
    echo ""

    # Check if eksctl is installed
    if ! command -v eksctl &> /dev/null; then
      echo "Error: eksctl is not installed"
      echo "Install: https://eksctl.io/installation/"
      exit 1
    fi

    # Create EKS cluster
    eksctl create cluster \
      --name "$CLUSTER_NAME" \
      --region "$REGION" \
      --nodegroup-name standard-workers \
      --node-type "$NODE_TYPE" \
      --nodes "$DESIRED_NODES" \
      --nodes-min "$MIN_NODES" \
      --nodes-max "$MAX_NODES" \
      --managed \
      --with-oidc \
      --ssh-access \
      --ssh-public-key ~/.ssh/id_rsa.pub \
      --full-ecr-access \
      --alb-ingress-access

    echo ""
    echo "✅ EKS cluster created successfully!"
    ;;

  gcp)
    echo "Creating GKE cluster on Google Cloud..."
    echo "Cluster name: $CLUSTER_NAME"
    echo "Region: $REGION"
    echo "Node type: ${NODE_TYPE:-n2-standard-8}"
    echo "Nodes: $MIN_NODES-$MAX_NODES (desired: $DESIRED_NODES)"
    echo ""

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
      echo "Error: gcloud is not installed"
      echo "Install: https://cloud.google.com/sdk/docs/install"
      exit 1
    fi

    # Create GKE cluster
    gcloud container clusters create "$CLUSTER_NAME" \
      --region "$REGION" \
      --machine-type "${NODE_TYPE:-n2-standard-8}" \
      --num-nodes "$DESIRED_NODES" \
      --min-nodes "$MIN_NODES" \
      --max-nodes "$MAX_NODES" \
      --enable-autoscaling \
      --enable-autorepair \
      --enable-autoupgrade \
      --disk-size 200 \
      --disk-type pd-ssd

    echo ""
    echo "✅ GKE cluster created successfully!"
    ;;

  azure)
    echo "Creating AKS cluster on Azure..."
    echo "Cluster name: $CLUSTER_NAME"
    echo "Region: ${REGION:-eastus}"
    echo "Node type: ${NODE_TYPE:-Standard_D8s_v3}"
    echo "Nodes: $MIN_NODES-$MAX_NODES (desired: $DESIRED_NODES)"
    echo ""

    # Check if az is installed
    if ! command -v az &> /dev/null; then
      echo "Error: az CLI is not installed"
      echo "Install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
      exit 1
    fi

    # Create resource group
    RESOURCE_GROUP="${CLUSTER_NAME}-rg"
    az group create --name "$RESOURCE_GROUP" --location "${REGION:-eastus}"

    # Create AKS cluster
    az aks create \
      --resource-group "$RESOURCE_GROUP" \
      --name "$CLUSTER_NAME" \
      --location "${REGION:-eastus}" \
      --node-count "$DESIRED_NODES" \
      --min-count "$MIN_NODES" \
      --max-count "$MAX_NODES" \
      --node-vm-size "${NODE_TYPE:-Standard_D8s_v3}" \
      --enable-cluster-autoscaler \
      --enable-managed-identity \
      --network-plugin azure \
      --generate-ssh-keys

    # Get credentials
    az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME"

    echo ""
    echo "✅ AKS cluster created successfully!"
    ;;

  *)
    echo "Error: Unknown cloud provider: $CLOUD_PROVIDER"
    echo "Supported: aws, gcp, azure"
    exit 1
    ;;
esac

# Create production namespace
echo ""
echo "Creating production namespace..."
kubectl create namespace production

# Label namespace
kubectl label namespace production environment=production

# Create storage classes
echo ""
echo "Creating storage classes..."

case $CLOUD_PROVIDER in
  aws)
    cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF
    ;;

  gcp)
    cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF
    ;;

  azure)
    cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: disk.csi.azure.com
parameters:
  storageaccounttype: Premium_LRS
  kind: Managed
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF
    ;;
esac

echo ""
echo "✅ Storage class 'fast-ssd' created!"

# Verify cluster
echo ""
echo "Verifying cluster..."
kubectl cluster-info
kubectl get nodes

echo ""
echo "=========================================="
echo "✅ Cluster setup complete!"
echo "=========================================="
echo ""
echo "Cluster name: $CLUSTER_NAME"
echo "Namespace: production"
echo "Storage class: fast-ssd"
echo ""
echo "Next steps:"
echo "1. Run: ./2-install-dependencies.sh"
echo "2. Generate secrets: ./3-generate-secrets.sh"
echo "3. Deploy components: ./4-deploy-all.sh"
