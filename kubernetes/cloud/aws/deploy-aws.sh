#!/bin/bash

# Exit on error
set -e

# Set variables
AWS_REGION="us-east-1"
CLUSTER_NAME="xnl-fintech-cluster"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=eksctl-${CLUSTER_NAME}-cluster/VPC" --query "Vpcs[0].VpcId" --output text)

echo "Deploying XNL Fintech Platform to AWS..."
echo "AWS Region: ${AWS_REGION}"
echo "Cluster Name: ${CLUSTER_NAME}"
echo "Account ID: ${ACCOUNT_ID}"
echo "VPC ID: ${VPC_ID}"

# Create EKS cluster
echo "Creating EKS cluster..."
eksctl create cluster -f eks-cluster.yaml

# Update kubeconfig
echo "Updating kubeconfig..."
aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

# Create namespaces
echo "Creating namespaces..."
kubectl apply -f ../../base/namespace.yaml
kubectl apply -f ../../monitoring/namespace.yaml

# Deploy AWS Load Balancer Controller
echo "Deploying AWS Load Balancer Controller..."
# Replace placeholder values
sed -i "s/ACCOUNT_ID/${ACCOUNT_ID}/g" aws-load-balancer-controller.yaml
sed -i "s/vpc-XXXXXXXXXXXXXXXXX/${VPC_ID}/g" aws-load-balancer-controller.yaml
kubectl apply -f aws-load-balancer-controller.yaml

# Create DocumentDB cluster
echo "Creating DocumentDB cluster..."
aws cloudformation create-stack \
  --stack-name xnl-fintech-documentdb \
  --template-body file://mongodb-documentdb.yaml \
  --parameters \
    ParameterKey=VpcId,ParameterValue=${VPC_ID} \
    ParameterKey=SubnetIds,ParameterValue=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query "Subnets[?MapPublicIpOnLaunch==\`false\`].SubnetId" --output text | tr '\t' ',') \
    ParameterKey=MasterUsername,ParameterValue=xnladmin \
    ParameterKey=MasterUserPassword,ParameterValue=REPLACE_WITH_SECURE_PASSWORD \
    ParameterKey=InstanceType,ParameterValue=db.r5.large \
    ParameterKey=InstanceCount,ParameterValue=3

# Create ElastiCache Redis cluster
echo "Creating ElastiCache Redis cluster..."
aws cloudformation create-stack \
  --stack-name xnl-fintech-redis \
  --template-body file://elasticache-redis.yaml \
  --parameters \
    ParameterKey=VpcId,ParameterValue=${VPC_ID} \
    ParameterKey=SubnetIds,ParameterValue=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query "Subnets[?MapPublicIpOnLaunch==\`false\`].SubnetId" --output text | tr '\t' ',') \
    ParameterKey=NodeType,ParameterValue=cache.t3.medium \
    ParameterKey=NumShards,ParameterValue=2 \
    ParameterKey=ReplicasPerShard,ParameterValue=1

# Create Amazon MQ RabbitMQ broker
echo "Creating Amazon MQ RabbitMQ broker..."
aws cloudformation create-stack \
  --stack-name xnl-fintech-rabbitmq \
  --template-body file://amazon-mq-rabbitmq.yaml \
  --parameters \
    ParameterKey=VpcId,ParameterValue=${VPC_ID} \
    ParameterKey=SubnetIds,ParameterValue=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query "Subnets[?MapPublicIpOnLaunch==\`false\`].SubnetId" --output text | tr '\t' ',') \
    ParameterKey=InstanceType,ParameterValue=mq.m5.large \
    ParameterKey=DeploymentMode,ParameterValue=CLUSTER_MULTI_AZ \
    ParameterKey=AdminUsername,ParameterValue=xnladmin \
    ParameterKey=AdminPassword,ParameterValue=REPLACE_WITH_SECURE_PASSWORD

# Wait for CloudFormation stacks to complete
echo "Waiting for CloudFormation stacks to complete..."
aws cloudformation wait stack-create-complete --stack-name xnl-fintech-documentdb
aws cloudformation wait stack-create-complete --stack-name xnl-fintech-redis
aws cloudformation wait stack-create-complete --stack-name xnl-fintech-rabbitmq

# Get connection information
echo "Getting connection information..."
MONGODB_URI=$(aws cloudformation describe-stacks --stack-name xnl-fintech-documentdb --query "Stacks[0].Outputs[?OutputKey=='DocumentDBConnectionString'].OutputValue" --output text)
REDIS_URI=$(aws cloudformation describe-stacks --stack-name xnl-fintech-redis --query "Stacks[0].Outputs[?OutputKey=='RedisConnectionString'].OutputValue" --output text)
RABBITMQ_URI=$(aws cloudformation describe-stacks --stack-name xnl-fintech-rabbitmq --query "Stacks[0].Outputs[?OutputKey=='RabbitMQConnectionString'].OutputValue" --output text)

# Create Kubernetes secrets
echo "Creating Kubernetes secrets..."
kubectl create secret generic mongodb-secret \
  --namespace xnl-fintech-prod \
  --from-literal=uri="${MONGODB_URI}"

kubectl create secret generic redis-secret \
  --namespace xnl-fintech-prod \
  --from-literal=uri="${REDIS_URI}"

kubectl create secret generic rabbitmq-secret \
  --namespace xnl-fintech-prod \
  --from-literal=url="${RABBITMQ_URI}"

kubectl create secret generic jwt-secret \
  --namespace xnl-fintech-prod \
  --from-literal=secret="REPLACE_WITH_SECURE_JWT_SECRET"

kubectl create secret generic email-secret \
  --namespace xnl-fintech-prod \
  --from-literal=api-key="REPLACE_WITH_EMAIL_API_KEY"

# Deploy application
echo "Deploying application..."
kubectl apply -k ../../overlays/prod

# Deploy monitoring
echo "Deploying monitoring..."
cd ../../monitoring
./deploy-monitoring.sh

# Deploy ALB Ingress
echo "Deploying ALB Ingress..."
# Replace placeholder values
sed -i "s/ACCOUNT_ID/${ACCOUNT_ID}/g" ../cloud/aws/alb-ingress.yaml
sed -i "s/CERTIFICATE_ID/REPLACE_WITH_CERTIFICATE_ID/g" ../cloud/aws/alb-ingress.yaml
kubectl apply -f ../cloud/aws/alb-ingress.yaml

echo "Deployment completed successfully!"
echo "MongoDB URI: ${MONGODB_URI}"
echo "Redis URI: ${REDIS_URI}"
echo "RabbitMQ URI: ${RABBITMQ_URI}"
echo "Application will be available at: https://www.xnl-fintech.com"
echo "API will be available at: https://api.xnl-fintech.com"
echo "Monitoring will be available at: https://monitoring.xnl-fintech.com" 