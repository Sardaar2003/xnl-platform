# XNL Fintech Platform Monitoring Setup

This document provides a detailed explanation of the monitoring setup for the XNL Fintech Platform using Prometheus and Grafana.

## Architecture Overview

The monitoring architecture consists of the following components:

1. **Prometheus**: Collects and stores metrics from services
2. **Grafana**: Visualizes metrics in dashboards
3. **Service Instrumentation**: Node.js services expose metrics endpoints
4. **Kubernetes Integration**: Prometheus scrapes metrics from Kubernetes components

## Components

### Prometheus

Prometheus is configured to scrape metrics from:

- Kubernetes API servers
- Kubernetes nodes
- Kubernetes pods
- XNL Fintech services

The Prometheus configuration is stored in a ConfigMap and includes:

- Global settings (scrape interval, evaluation interval)
- Job configurations for different targets
- Relabeling rules to filter and format metrics

### Grafana

Grafana is configured with:

- Prometheus as a data source
- Pre-configured dashboards for XNL Fintech services
- User authentication

### Service Instrumentation

Each service is instrumented to expose metrics using:

- The `prom-client` library for Node.js
- A custom metrics middleware that tracks:
  - HTTP request counts and durations
  - Database operation counts
  - RabbitMQ message counts

## Metrics Collected

### System Metrics

- CPU usage
- Memory usage
- Disk I/O
- Network I/O

### Application Metrics

- HTTP request count by endpoint, method, and status code
- HTTP request duration by endpoint, method, and status code
- Database operation count by operation type and collection
- RabbitMQ message count by type, queue, and status

## Dashboards

The monitoring setup includes pre-configured dashboards:

1. **XNL Fintech Overview**: Shows high-level metrics for all services
2. **Service-Specific Dashboards**: Detailed metrics for each service
3. **Infrastructure Dashboard**: Kubernetes and node metrics

## Alerting

Alerting is configured for critical conditions:

- High error rates
- Service unavailability
- Resource constraints (CPU, memory)

## Setup Instructions

1. Deploy the monitoring namespace:
   ```bash
   kubectl apply -f namespace.yaml
   ```

2. Deploy Prometheus:
   ```bash
   kubectl apply -f prometheus-config.yaml
   kubectl apply -f prometheus-rbac.yaml
   kubectl apply -f prometheus-deployment.yaml
   kubectl apply -f prometheus-service.yaml
   ```

3. Deploy Grafana:
   ```bash
   kubectl apply -f grafana-datasources.yaml
   kubectl apply -f grafana-dashboards.yaml
   kubectl apply -f grafana-secret.yaml
   kubectl apply -f grafana-deployment.yaml
   kubectl apply -f grafana-service.yaml
   kubectl apply -f grafana-ingress.yaml
   ```

4. Update services to expose metrics:
   ```bash
   # Add prom-client to package.json
   cd kubernetes/monitoring
   ./update-package-json.sh
   
   # Update service code to include metrics middleware
   node update-service-metrics.js
   
   # Update Kubernetes deployments with Prometheus annotations
   ./update-services-for-monitoring.sh
   ```

## Accessing Monitoring

- Grafana: http://grafana.xnl-fintech.local (admin / xnl-fintech-secure-password)
- Prometheus: http://prometheus:9090 (internal to the cluster)

## Maintenance

### Adding New Metrics

To add new metrics to a service:

1. Update the metrics middleware in `services/common/middleware/metrics.middleware.js`
2. Restart the service

### Adding New Dashboards

To add new dashboards:

1. Create the dashboard in Grafana
2. Export the dashboard JSON
3. Add it to the `grafana-dashboards.yaml` ConfigMap
4. Apply the changes:
   ```bash
   kubectl apply -f grafana-dashboards.yaml
   ```

## Troubleshooting

### Common Issues

1. **Metrics not showing up**:
   - Check if the service is exposing the `/metrics` endpoint
   - Verify Prometheus scrape configuration
   - Check Prometheus targets in the Prometheus UI

2. **Grafana can't connect to Prometheus**:
   - Verify the Prometheus service is running
   - Check the Grafana datasource configuration

3. **Dashboard shows no data**:
   - Check if the metrics exist in Prometheus
   - Verify the PromQL queries in the dashboard 