# XNL Fintech Platform Kubernetes Deployment

This directory contains Kubernetes manifests and scripts for deploying the XNL Fintech Platform.

## Directory Structure

- `base/`: Kubernetes manifests for deploying microservices
- `overlays/`: Environment-specific configurations (dev, prod)
- `monitoring/`: Prometheus and Grafana setup for monitoring
- `cloud/`: Cloud provider-specific deployment configurations
- `ingress/`: Ingress configurations for external access
- `config/`: ConfigMaps and Secrets for configuration

## Deployment Options

### Local Development

For local development, you can use Minikube or Docker Desktop with Kubernetes enabled.

1. Deploy the namespace:
   ```bash
   kubectl apply -f base/namespace.yaml
   ```

2. Deploy the services:
   ```bash
   kubectl apply -k overlays/dev
   ```

3. Deploy the monitoring stack:
   ```bash
   cd monitoring
   ./deploy-monitoring.sh
   ```

### Cloud Deployment

For production deployment, we support the following cloud providers:

- **AWS**: Amazon Web Services deployment using EKS, DocumentDB, ElastiCache, and Amazon MQ

To deploy to AWS:

```bash
cd cloud/aws
./deploy-aws.sh
```

For detailed instructions, see the [Cloud Deployment README](cloud/README.md).

## Monitoring

The platform includes a comprehensive monitoring setup with Prometheus and Grafana. See the [monitoring README](monitoring/README.md) for details.

## Scaling

Services are configured with Horizontal Pod Autoscalers (HPAs) to automatically scale based on CPU and memory usage.

## Environment-Specific Configurations

- Development: `kubectl apply -k overlays/dev/`
- Production: `kubectl apply -k overlays/prod/`

## Troubleshooting

### Common Issues

1. **Services not starting**: Check logs with `kubectl logs -n xnl-fintech <pod-name>`
2. **Database connection issues**: Verify ConfigMaps and Secrets are correctly applied
3. **Ingress not working**: Ensure your Ingress controller is properly configured

### Useful Commands

```bash
# Get all resources in the xnl-fintech namespace
kubectl get all -n xnl-fintech

# Describe a specific pod
kubectl describe pod -n xnl-fintech <pod-name>

# View logs for a specific container
kubectl logs -n xnl-fintech <pod-name> -c <container-name>

# Port-forward to a service for local testing
kubectl port-forward -n xnl-fintech svc/<service-name> <local-port>:<service-port>
``` 