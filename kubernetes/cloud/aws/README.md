# XNL Fintech Platform AWS Deployment

This directory contains configuration files and scripts for deploying the XNL Fintech Platform to AWS.

## Prerequisites

Before deploying, ensure you have the following tools installed:

- AWS CLI (configured with appropriate credentials)
- eksctl
- kubectl
- jq

## AWS Resources

The deployment creates the following AWS resources:

1. **Amazon EKS Cluster**: Managed Kubernetes cluster for running the application
2. **Amazon DocumentDB**: MongoDB-compatible database for storing application data
3. **Amazon ElastiCache (Redis)**: In-memory cache for improving application performance
4. **Amazon MQ (RabbitMQ)**: Message broker for event-driven communication
5. **AWS Load Balancer Controller**: For managing Application Load Balancers
6. **Amazon Certificate Manager**: For SSL/TLS certificates

## Deployment Steps

### For Linux/macOS Users

1. Make the deployment script executable:
   ```bash
   chmod +x deploy-aws.sh
   ```

2. Edit the script to replace placeholder values:
   - `REPLACE_WITH_SECURE_PASSWORD`: Set secure passwords for DocumentDB and RabbitMQ
   - `REPLACE_WITH_SECURE_JWT_SECRET`: Set a secure JWT secret
   - `REPLACE_WITH_EMAIL_API_KEY`: Set your email service API key
   - `REPLACE_WITH_CERTIFICATE_ID`: Set your ACM certificate ID

3. Run the deployment script:
   ```bash
   ./deploy-aws.sh
   ```

### For Windows Users

1. Edit the PowerShell script to replace placeholder values:
   - `REPLACE_WITH_SECURE_PASSWORD`: Set secure passwords for DocumentDB and RabbitMQ
   - `REPLACE_WITH_SECURE_JWT_SECRET`: Set a secure JWT secret
   - `REPLACE_WITH_EMAIL_API_KEY`: Set your email service API key
   - `REPLACE_WITH_CERTIFICATE_ID`: Set your ACM certificate ID

2. Run the PowerShell deployment script:
   ```powershell
   .\deploy-aws.ps1
   ```

## Configuration Files

- `eks-cluster.yaml`: EKS cluster configuration
- `aws-load-balancer-controller.yaml`: AWS Load Balancer Controller configuration
- `mongodb-documentdb.yaml`: Amazon DocumentDB CloudFormation template
- `elasticache-redis.yaml`: Amazon ElastiCache CloudFormation template
- `amazon-mq-rabbitmq.yaml`: Amazon MQ CloudFormation template
- `alb-ingress.yaml`: Application Load Balancer Ingress configuration

## Post-Deployment

After deployment, the application will be available at:

- Frontend: https://www.xnl-fintech.com
- API: https://api.xnl-fintech.com
- Monitoring: https://monitoring.xnl-fintech.com

## Cleanup

To delete all AWS resources created by this deployment:

### For Linux/macOS Users

```bash
# Delete Kubernetes resources
kubectl delete -k ../../overlays/prod
kubectl delete -f ../../monitoring/namespace.yaml
kubectl delete -f ../../base/namespace.yaml

# Delete CloudFormation stacks
aws cloudformation delete-stack --stack-name xnl-fintech-rabbitmq
aws cloudformation delete-stack --stack-name xnl-fintech-redis
aws cloudformation delete-stack --stack-name xnl-fintech-documentdb

# Delete EKS cluster
eksctl delete cluster -f eks-cluster.yaml
```

### For Windows Users

```powershell
# Delete Kubernetes resources
kubectl delete -k ..\..\overlays\prod
kubectl delete -f ..\..\monitoring\namespace.yaml
kubectl delete -f ..\..\base\namespace.yaml

# Delete CloudFormation stacks
aws cloudformation delete-stack --stack-name xnl-fintech-rabbitmq
aws cloudformation delete-stack --stack-name xnl-fintech-redis
aws cloudformation delete-stack --stack-name xnl-fintech-documentdb

# Delete EKS cluster
eksctl delete cluster -f eks-cluster.yaml
```

## Troubleshooting

### Common Issues

1. **EKS Cluster Creation Fails**: Ensure you have sufficient IAM permissions and quota limits.
2. **CloudFormation Stack Creation Fails**: Check the CloudFormation events for detailed error messages.
3. **Ingress Not Working**: Verify that the AWS Load Balancer Controller is running and the ACM certificate is valid.
4. **Connection Issues**: Ensure that security groups allow traffic between services.

### Useful Commands

```bash
# Check EKS cluster status
eksctl get cluster --name xnl-fintech-cluster

# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name xnl-fintech-documentdb

# Check Kubernetes resources
kubectl get all -n xnl-fintech-prod

# Check AWS Load Balancer Controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller
``` 