#!/bin/bash
set -e

cd "$(dirname "$0")"

# Load configuration
if [ ! -f deploy.env ]; then
    echo "Error: deploy.env not found. Copy deploy.env.example to deploy.env and configure."
    exit 1
fi
source deploy.env

echo "=== Creating NFS directory ==="

ssh ${NFS_USER}@${NFS_SERVER} "sudo mkdir -p ${NFS_PATH} && sudo chmod 777 ${NFS_PATH}"

echo ""
echo "=== Generating k8s manifest ==="

# Generate manifest from template with substituted values
envsubst < jollykite.yaml.template > jollykite.yaml

echo ""
echo "=== Deploying to k3s ==="

kubectl apply -f jollykite.yaml

echo ""
echo "=== Waiting for rollout ==="

kubectl -n jollykite rollout status deployment/jollykite-backend --timeout=120s
kubectl -n jollykite rollout status deployment/jollykite-nginx --timeout=120s

echo ""
echo "=== Done! ==="
echo "Access JollyKite at: http://${K3S_NODE_IP}:${NODE_PORT}"
