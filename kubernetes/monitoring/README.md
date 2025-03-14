# XNL Fintech Platform Monitoring

This directory contains Kubernetes manifests for deploying a monitoring stack for the XNL Fintech Platform using Prometheus and Grafana.

## Components

- **Prometheus**: For metrics collection and storage
- **Grafana**: For metrics visualization and dashboarding

## Deployment

### On Linux/macOS

To deploy the monitoring stack, run:

```bash
chmod +x deploy-monitoring.sh
./deploy-monitoring.sh
```

### On Windows

To deploy the monitoring stack, run:

```powershell
.\deploy-monitoring.ps1
```

Alternatively, you can run each command in the `deploy-monitoring.sh` script manually:

```powershell
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
```

## Accessing Grafana

Grafana will be available at: http://grafana.xnl-fintech.local

Default credentials:
- Username: admin
- Password: xnl-fintech-secure-password

## Dashboards

The deployment includes a pre-configured dashboard for the XNL Fintech Platform:

- **XNL Fintech Dashboard**: Shows HTTP request rates for all services in the platform

## Adding Custom Dashboards

To add custom dashboards:

1. Create your dashboard in Grafana
2. Export the dashboard JSON
3. Add it to the `grafana-dashboards.yaml` ConfigMap
4. Apply the changes:
   ```bash
   kubectl apply -f grafana-dashboards.yaml
   ```

## Metrics Collection

Prometheus is configured to collect metrics from:

- Kubernetes API servers
- Kubernetes nodes
- Kubernetes pods
- XNL Fintech services (via annotations)

To expose metrics from your services, add the following annotations to your pod template:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8080"  # Replace with your metrics port
  prometheus.io/path: "/metrics"  # Replace with your metrics path
```

## Updating Services for Monitoring

### On Linux/macOS

```bash
# Add prom-client to package.json
chmod +x update-package-json.sh
./update-package-json.sh

# Update service code to include metrics middleware
node update-service-metrics.js

# Update Kubernetes deployments with Prometheus annotations
chmod +x update-services-for-monitoring.sh
./update-services-for-monitoring.sh
```

### On Windows

```powershell
# Add prom-client to package.json
.\update-package-json.ps1

# Update service code to include metrics middleware
node update-service-metrics.js

# Update Kubernetes deployments with Prometheus annotations
.\update-services-for-monitoring.ps1
```

## Additional Documentation

For more detailed information about the monitoring setup, please refer to:

- [MONITORING_SETUP.md](MONITORING_SETUP.md): Detailed explanation of the monitoring architecture
- [SUMMARY.md](SUMMARY.md): Summary of the monitoring implementation 