#!/bin/bash
set -e

cd "$(dirname "$0")/.."

NFS_NODE="mikoadmin@172.16.33.69"

echo "=== Creating NFS directory ==="

ssh $NFS_NODE "sudo mkdir -p /data/nfs/shared/jollykite && sudo chmod 777 /data/nfs/shared/jollykite"

echo ""
echo "=== Deploying to k3s ==="

kubectl apply -f k8s/jollykite.yaml

echo ""
echo "=== Waiting for rollout ==="

kubectl -n jollykite rollout status deployment/jollykite-backend --timeout=120s
kubectl -n jollykite rollout status deployment/jollykite-nginx --timeout=120s

echo ""
echo "=== Done! ==="
echo "Access JollyKite at: http://172.16.33.61:30080"
