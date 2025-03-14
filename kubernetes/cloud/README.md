# XNL Fintech Platform Cloud Deployment

This directory contains configuration files and scripts for deploying the XNL Fintech Platform to various cloud providers.

## Supported Cloud Providers

- [AWS](aws/README.md): Amazon Web Services deployment using EKS, DocumentDB, ElastiCache, and Amazon MQ

## Cloud Deployment Overview

The XNL Fintech Platform is designed to be deployed to any cloud provider that supports Kubernetes. The deployment process involves:

1. **Infrastructure Provisioning**: Creating the necessary cloud resources (Kubernetes cluster, databases, message brokers, etc.)
2. **Kubernetes Deployment**: Deploying the application to the Kubernetes cluster
3. **Configuration**: Setting up environment-specific configurations
4. **Monitoring**: Deploying Prometheus and Grafana for monitoring

## Common Components

Regardless of the cloud provider, the following components are deployed:

- **Kubernetes Cluster**: For orchestrating the application containers
- **MongoDB**: For storing application data
- **Redis**: For caching and session management
- **RabbitMQ**: For message brokering and event-driven communication
- **Prometheus & Grafana**: For monitoring and alerting

## Deployment Process

1. Choose a cloud provider (currently only AWS is supported)
2. Follow the provider-specific deployment instructions
3. Verify the deployment by accessing the application endpoints

## Future Cloud Providers

We plan to add support for the following cloud providers in the future:

- **GCP**: Google Cloud Platform deployment using GKE, Cloud SQL, Memorystore, and Cloud Pub/Sub
- **Azure**: Microsoft Azure deployment using AKS, Cosmos DB, Azure Cache for Redis, and Azure Service Bus

## Contributing

To add support for a new cloud provider:

1. Create a new directory for the cloud provider (e.g., `gcp`, `azure`)
2. Create the necessary configuration files and deployment scripts
3. Update this README with information about the new cloud provider
4. Submit a pull request 