#!/bin/bash

# This script updates the package.json files of all services to include the Prometheus client

# Define the services to update
SERVICES=("account-service" "transaction-service" "user-service" "notification-service")

# Loop through each service
for SERVICE in "${SERVICES[@]}"; do
  echo "Updating $SERVICE package.json..."
  
  # Get the package.json file path
  PACKAGE_JSON="../../services/$SERVICE/package.json"
  
  if [ -f "$PACKAGE_JSON" ]; then
    # Check if prom-client is already in dependencies
    if ! grep -q "prom-client" "$PACKAGE_JSON"; then
      # Add prom-client to dependencies
      # This uses jq to properly modify the JSON
      # First, we need to check if jq is installed
      if command -v jq >/dev/null 2>&1; then
        # Use jq to add prom-client to dependencies
        jq '.dependencies["prom-client"] = "^14.2.0"' "$PACKAGE_JSON" > "$PACKAGE_JSON.tmp" && mv "$PACKAGE_JSON.tmp" "$PACKAGE_JSON"
        echo "  Added prom-client to $SERVICE dependencies"
      else
        echo "  WARNING: jq is not installed. Please install jq or manually add prom-client to $PACKAGE_JSON"
        echo "  Add the following to dependencies: \"prom-client\": \"^14.2.0\""
      fi
    else
      echo "  prom-client already exists in $SERVICE"
    fi
  else
    echo "  package.json for $SERVICE not found at $PACKAGE_JSON"
  fi
done

echo "All services updated with prom-client dependency"
echo "Please run 'npm install' in each service directory to install the new dependency" 