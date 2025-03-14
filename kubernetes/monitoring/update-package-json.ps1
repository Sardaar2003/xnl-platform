# PowerShell script to update package.json files with Prometheus client

Write-Host "Updating package.json files with Prometheus client..." -ForegroundColor Green

# Define the services to update
$services = @("account-service", "transaction-service", "user-service", "notification-service")

# Loop through each service
foreach ($service in $services) {
    Write-Host "Updating $service package.json..." -ForegroundColor Cyan
    
    # Get the package.json file path
    $packageJsonPath = "../../services/$service/package.json"
    
    if (Test-Path $packageJsonPath) {
        # Read the package.json file
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        
        # Check if prom-client is already in dependencies
        if (-not $packageJson.dependencies.PSObject.Properties.Name.Contains("prom-client")) {
            Write-Host "  Adding prom-client to $service dependencies..." -ForegroundColor Yellow
            
            # Add prom-client to dependencies
            $packageJson.dependencies | Add-Member -Name "prom-client" -Value "^14.2.0" -MemberType NoteProperty
            
            # Convert back to JSON and write to file
            $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
            
            Write-Host "  Added prom-client to $service dependencies" -ForegroundColor Green
        }
        else {
            Write-Host "  prom-client already exists in $service" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  package.json for $service not found at $packageJsonPath" -ForegroundColor Red
    }
}

Write-Host "All services updated with prom-client dependency" -ForegroundColor Green
Write-Host "Please run 'npm install' in each service directory to install the new dependency" -ForegroundColor Yellow 