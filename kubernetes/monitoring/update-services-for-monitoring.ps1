# PowerShell script to update XNL Fintech services for monitoring

Write-Host "Updating XNL Fintech services for monitoring..." -ForegroundColor Green

# Define the services to update
$services = @("account-service", "transaction-service", "user-service", "notification-service")

# Loop through each service
foreach ($service in $services) {
    Write-Host "Updating $service deployment..." -ForegroundColor Cyan
    
    # Get the deployment file path
    $deploymentFile = "../services/$service-deployment.yaml"
    
    if (Test-Path $deploymentFile) {
        # Check if Prometheus annotations already exist
        $content = Get-Content $deploymentFile -Raw
        if ($content -notmatch "prometheus.io/scrape") {
            Write-Host "  Adding Prometheus annotations to $service..." -ForegroundColor Yellow
            
            # Read the file content
            $lines = Get-Content $deploymentFile
            
            # Find the line with 'template:' and the next line with 'metadata:'
            $templateIndex = -1
            $metadataIndex = -1
            
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "template:") {
                    $templateIndex = $i
                }
                if ($templateIndex -ne -1 -and $i -gt $templateIndex -and $lines[$i] -match "metadata:") {
                    $metadataIndex = $i
                    break
                }
            }
            
            if ($metadataIndex -ne -1) {
                # Insert annotations after metadata line
                $newLines = @()
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    $newLines += $lines[$i]
                    if ($i -eq $metadataIndex) {
                        $newLines += "        annotations:"
                        $newLines += "          prometheus.io/scrape: `"true`""
                        $newLines += "          prometheus.io/port: `"3000`""
                        $newLines += "          prometheus.io/path: `"/metrics`""
                    }
                }
                
                # Write the updated content back to the file
                $newLines | Set-Content $deploymentFile
                Write-Host "  Updated $service deployment" -ForegroundColor Green
            } else {
                Write-Host "  Could not find metadata section in $service deployment" -ForegroundColor Red
            }
        } else {
            Write-Host "  Prometheus annotations already exist in $service" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  Deployment file for $service not found at $deploymentFile" -ForegroundColor Red
    }
}

Write-Host "All services updated with Prometheus annotations" -ForegroundColor Green
Write-Host "Please apply the changes with: kubectl apply -f ../services/" -ForegroundColor Yellow 