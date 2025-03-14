# Start all services for XNL Fintech Platform

# Create logs directory if it doesn't exist
if (-not (Test-Path -Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "Created logs directory" -ForegroundColor Green
}

# Start User Service
Write-Host "Starting User Service..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "start-user-service.js" -NoNewWindow

# Wait for User Service to initialize
Write-Host "Waiting for User Service to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start API Gateway
Write-Host "Starting API Gateway..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "start-api-gateway.js" -NoNewWindow

# Wait for API Gateway to initialize
Write-Host "Waiting for API Gateway to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Green
Set-Location -Path "frontend/admin-panel"
Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow

Write-Host "All services started successfully!" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Red 