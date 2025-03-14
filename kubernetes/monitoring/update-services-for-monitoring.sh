#!/bin/bash

# This script updates the XNL Fintech service deployments to include Prometheus annotations

# Define the services to update
SERVICES=("account-service" "transaction-service" "user-service" "notification-service")

# Loop through each service
for SERVICE in "${SERVICES[@]}"; do
  echo "Updating $SERVICE deployment..."
  
  # Get the deployment file path
  DEPLOYMENT_FILE="../services/$SERVICE-deployment.yaml"
  
  if [ -f "$DEPLOYMENT_FILE" ]; then
    # Add Prometheus annotations if they don't exist
    if ! grep -q "prometheus.io/scrape" "$DEPLOYMENT_FILE"; then
      # Find the line with 'template:' and the next line with 'metadata:'
      # Then add annotations after that
      sed -i '/template:/,/metadata:/{/metadata:/a\        annotations:\n          prometheus.io/scrape: "true"\n          prometheus.io/port: "3000"\n          prometheus.io/path: "/metrics"' "$DEPLOYMENT_FILE"
    else
      echo "  Prometheus annotations already exist in $SERVICE"
    fi
    
    echo "  Updated $SERVICE deployment"
  else
    echo "  Deployment file for $SERVICE not found at $DEPLOYMENT_FILE"
  fi
done

echo "All services updated with Prometheus annotations"
echo "Please apply the changes with: kubectl apply -f ../services/"