# PowerShell script to deploy XNL Fintech Platform to AWS

# Set error action preference
$ErrorActionPreference = "Stop"

# Set variables
$AWS_REGION = "us-east-1"
$CLUSTER_NAME = "xnl-fintech-cluster"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$VPC_ID = (aws ec2 describe-vpcs --filters "Name=tag:Name,Values=eksctl-${CLUSTER_NAME}-cluster/VPC" --query "Vpcs[0].VpcId" --output text)

Write-Host "Deploying XNL Fintech Platform to AWS..." -ForegroundColor Green
Write-Host "AWS Region: $AWS_REGION" -ForegroundColor Cyan
Write-Host "Cluster Name: $CLUSTER_NAME" -ForegroundColor Cyan
Write-Host "Account ID: $ACCOUNT_ID" -ForegroundColor Cyan
Write-Host "VPC ID: $VPC_ID" -ForegroundColor Cyan

# Create EKS cluster
Write-Host "Creating EKS cluster..." -ForegroundColor Green
eksctl create cluster -f eks-cluster.yaml

# Update kubeconfig
Write-Host "Updating kubeconfig..." -ForegroundColor Green
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

# Create namespaces
Write-Host "Creating namespaces..." -ForegroundColor Green
kubectl apply -f ..\..\base\namespace.yaml
kubectl apply -f ..\..\monitoring\namespace.yaml

# Deploy AWS Load Balancer Controller
Write-Host "Deploying AWS Load Balancer Controller..." -ForegroundColor Green
# Replace placeholder values
(Get-Content aws-load-balancer-controller.yaml) -replace 'ACCOUNT_ID', $ACCOUNT_ID | Set-Content aws-load-balancer-controller.yaml
(Get-Content aws-load-balancer-controller.yaml) -replace 'vpc-XXXXXXXXXXXXXXXXX', $VPC_ID | Set-Content aws-load-balancer-controller.yaml
kubectl apply -f aws-load-balancer-controller.yaml

# Get private subnet IDs
$SUBNET_IDS = (aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[?MapPublicIpOnLaunch==``false``].SubnetId" --output text) -replace '\s+', ','

# Create DocumentDB cluster
Write-Host "Creating DocumentDB cluster..." -ForegroundColor Green
aws cloudformation create-stack `
    --stack-name xnl-fintech-documentdb `
    --template-body file://mongodb-documentdb.yaml `
    --parameters `
    ParameterKey=VpcId, ParameterValue=$VPC_ID `
    ParameterKey=SubnetIds, ParameterValue=$SUBNET_IDS `
    ParameterKey=MasterUsername, ParameterValue=xnladmin `
    ParameterKey=MasterUserPassword, ParameterValue=REPLACE_WITH_SECURE_PASSWORD `
    ParameterKey=InstanceType, ParameterValue=db.r5.large `
    ParameterKey=InstanceCount, ParameterValue=3

# Create ElastiCache Redis cluster
Write-Host "Creating ElastiCache Redis cluster..." -ForegroundColor Green
aws cloudformation create-stack `
    --stack-name xnl-fintech-redis `
    --template-body file://elasticache-redis.yaml `
    --parameters `
    ParameterKey=VpcId, ParameterValue=$VPC_ID `
    ParameterKey=SubnetIds, ParameterValue=$SUBNET_IDS `
    ParameterKey=NodeType, ParameterValue=cache.t3.medium `
    ParameterKey=NumShards, ParameterValue=2 `
    ParameterKey=ReplicasPerShard, ParameterValue=1

# Create Amazon MQ RabbitMQ broker
Write-Host "Creating Amazon MQ RabbitMQ broker..." -ForegroundColor Green
aws cloudformation create-stack `
    --stack-name xnl-fintech-rabbitmq `
    --template-body file://amazon-mq-rabbitmq.yaml `
    --parameters `
    ParameterKey=VpcId, ParameterValue=$VPC_ID `
    ParameterKey=SubnetIds, ParameterValue=$SUBNET_IDS `
    ParameterKey=InstanceType, ParameterValue=mq.m5.large `
    ParameterKey=DeploymentMode, ParameterValue=CLUSTER_MULTI_AZ `
    ParameterKey=AdminUsername, ParameterValue=xnladmin `
    ParameterKey=AdminPassword, ParameterValue=REPLACE_WITH_SECURE_PASSWORD

# Wait for CloudFormation stacks to complete
Write-Host "Waiting for CloudFormation stacks to complete..." -ForegroundColor Green
aws cloudformation wait stack-create-complete --stack-name xnl-fintech-documentdb
aws cloudformation wait stack-create-complete --stack-name xnl-fintech-redis
aws cloudformation wait stack-create-complete --stack-name xnl-fintech-rabbitmq

# Get connection information
Write-Host "Getting connection information..." -ForegroundColor Green
$MONGODB_URI = (aws cloudformation describe-stacks --stack-name xnl-fintech-documentdb --query "Stacks[0].Outputs[?OutputKey=='DocumentDBConnectionString'].OutputValue" --output text)
$REDIS_URI = (aws cloudformation describe-stacks --stack-name xnl-fintech-redis --query "Stacks[0].Outputs[?OutputKey=='RedisConnectionString'].OutputValue" --output text)
$RABBITMQ_URI = (aws cloudformation describe-stacks --stack-name xnl-fintech-rabbitmq --query "Stacks[0].Outputs[?OutputKey=='RabbitMQConnectionString'].OutputValue" --output text)

# Create Kubernetes secrets
Write-Host "Creating Kubernetes secrets..." -ForegroundColor Green
kubectl create secret generic mongodb-secret `
    --namespace xnl-fintech-prod `
    --from-literal=uri=$MONGODB_URI

kubectl create secret generic redis-secret `
    --namespace xnl-fintech-prod `
    --from-literal=uri=$REDIS_URI

kubectl create secret generic rabbitmq-secret `
    --namespace xnl-fintech-prod `
    --from-literal=url=$RABBITMQ_URI

kubectl create secret generic jwt-secret `
    --namespace xnl-fintech-prod `
    --from-literal=secret="REPLACE_WITH_SECURE_JWT_SECRET"

kubectl create secret generic email-secret `
    --namespace xnl-fintech-prod `
    --from-literal=api-key="REPLACE_WITH_EMAIL_API_KEY"

# Deploy application
Write-Host "Deploying application..." -ForegroundColor Green
kubectl apply -k ..\..\overlays\prod

# Deploy monitoring
Write-Host "Deploying monitoring..." -ForegroundColor Green
Set-Location -Path ..\..\monitoring
.\deploy-monitoring.ps1
Set-Location -Path ..\cloud\aws

# Deploy ALB Ingress
Write-Host "Deploying ALB Ingress..." -ForegroundColor Green
# Replace placeholder values
(Get-Content alb-ingress.yaml) -replace 'ACCOUNT_ID', $ACCOUNT_ID | Set-Content alb-ingress.yaml
(Get-Content alb-ingress.yaml) -replace 'CERTIFICATE_ID', 'REPLACE_WITH_CERTIFICATE_ID' | Set-Content alb-ingress.yaml
kubectl apply -f alb-ingress.yaml

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "MongoDB URI: $MONGODB_URI" -ForegroundColor Yellow
Write-Host "Redis URI: $REDIS_URI" -ForegroundColor Yellow
Write-Host "RabbitMQ URI: $RABBITMQ_URI" -ForegroundColor Yellow
Write-Host "Application will be available at: https://www.xnl-fintech.com" -ForegroundColor Yellow
Write-Host "API will be available at: https://api.xnl-fintech.com" -ForegroundColor Yellow
Write-Host "Monitoring will be available at: https://monitoring.xnl-fintech.com" -ForegroundColor Yellow 