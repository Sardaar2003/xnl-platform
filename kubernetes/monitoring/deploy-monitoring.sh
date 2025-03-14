#!/bin/bash

# Create namespace first
kubectl apply -f namespace.yaml

# Apply RBAC resources
kubectl apply -f prometheus-rbac.yaml

# Apply ConfigMaps
kubectl apply -f prometheus-config.yaml
kubectl apply -f grafana-datasources.yaml
kubectl apply -f grafana-dashboards.yaml

# Apply Secrets
kubectl apply -f grafana-secret.yaml

# Deploy Prometheus
kubectl apply -f prometheus-deployment.yaml
kubectl apply -f prometheus-service.yaml

# Deploy Grafana
kubectl apply -f grafana-deployment.yaml
kubectl apply -f grafana-service.yaml
kubectl apply -f grafana-ingress.yaml

echo "Monitoring stack deployed successfully!"
echo "Grafana will be available at: http://grafana.xnl-fintech.local"
echo "Default credentials: admin / xnl-fintech-secure-password" 