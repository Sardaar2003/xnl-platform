# PowerShell script to deploy the XNL Fintech Platform monitoring stack

Write-Host "Deploying XNL Fintech Platform monitoring stack..." -ForegroundColor Green

# Create namespace first
Write-Host "Creating monitoring namespace..." -ForegroundColor Cyan
kubectl apply -f namespace.yaml

# Apply RBAC resources
Write-Host "Applying RBAC resources..." -ForegroundColor Cyan
kubectl apply -f prometheus-rbac.yaml

# Apply ConfigMaps
Write-Host "Applying ConfigMaps..." -ForegroundColor Cyan
kubectl apply -f prometheus-config.yaml
kubectl apply -f grafana-datasources.yaml
kubectl apply -f grafana-dashboards.yaml

# Apply Secrets
Write-Host "Applying Secrets..." -ForegroundColor Cyan
kubectl apply -f grafana-secret.yaml

# Deploy Prometheus
Write-Host "Deploying Prometheus..." -ForegroundColor Cyan
kubectl apply -f prometheus-deployment.yaml
kubectl apply -f prometheus-service.yaml

# Deploy Grafana
Write-Host "Deploying Grafana..." -ForegroundColor Cyan
kubectl apply -f grafana-deployment.yaml
kubectl apply -f grafana-service.yaml
kubectl apply -f grafana-ingress.yaml

Write-Host "Monitoring stack deployed successfully!" -ForegroundColor Green
Write-Host "Grafana will be available at: http://grafana.xnl-fintech.local" -ForegroundColor Yellow
Write-Host "Default credentials: admin / xnl-fintech-secure-password" -ForegroundColor Yellow 