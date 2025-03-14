# Start Services Script for XNL Fintech Platform
# This script starts all necessary services for the platform

# Create logs directory if it doesn't exist
if (-not (Test-Path -Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "Created logs directory" -ForegroundColor Green
}

# Get current timestamp for log files
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Function to log messages
function Write-Log {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Service,
        
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $false)]
        [string]$Level = "INFO"
    )
    
    $logMessage = "[$timestamp] [$Service] ${Level}`: $Message"
    $logMessage | Out-File -FilePath "logs/services.log" -Append
    
    # Also write to console with color based on level
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
        default { Write-Host $logMessage -ForegroundColor Cyan }
    }
}

# Check if RabbitMQ is running
Write-Host "Checking if RabbitMQ is running..." -ForegroundColor Yellow
try {
    $rabbitMQStatus = Test-NetConnection -ComputerName localhost -Port 5672 -InformationLevel Quiet
    if (-not $rabbitMQStatus) {
        Write-Log -Service "System" -Message "RabbitMQ is not running. Please start RabbitMQ before running this script." -Level "ERROR"
        exit 1
    }
}
catch {
    Write-Log -Service "System" -Message "Failed to check RabbitMQ status: $_" -Level "ERROR"
}

# Check if MongoDB is running
Write-Host "Checking if MongoDB is running..." -ForegroundColor Yellow
try {
    $mongoDBStatus = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet
    if (-not $mongoDBStatus) {
        Write-Log -Service "System" -Message "MongoDB is not running. Please start MongoDB before running this script." -Level "ERROR"
        exit 1
    }
}
catch {
    Write-Log -Service "System" -Message "Failed to check MongoDB status: $_" -Level "ERROR"
}

# Function to start a service and handle restarts
function Start-Service {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Name,
        
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        
        [Parameter(Mandatory = $true)]
        [string]$Command,
        
        [Parameter(Mandatory = $true)]
        [string]$Arguments
    )
    
    # Create log files for the service
    $stdoutLogFile = "logs/$($Name.ToLower().Replace(' ', '-'))-stdout.log"
    $stderrLogFile = "logs/$($Name.ToLower().Replace(' ', '-'))-stderr.log"
    
    # Start the service
    try {
        Write-Log -Service "System" -Message "Starting $Name..."
        $process = Start-Process -FilePath $Command -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -PassThru -RedirectStandardOutput $stdoutLogFile -RedirectStandardError $stderrLogFile -NoNewWindow
        
        # Wait a bit to check if the process started successfully
        Start-Sleep -Seconds 2
        
        if ($process.HasExited) {
            Write-Log -Service "System" -Message "$Name exited with code $($process.ExitCode)" -Level "ERROR"
            return $null
        }
        
        Write-Log -Service "System" -Message "$Name started with PID $($process.Id)"
        return $process
    }
    catch {
        Write-Log -Service "System" -Message "Failed to start ${Name}`: $_" -Level "ERROR"
        return $null
    }
}

# Start User Service
Write-Host "Starting User Service..." -ForegroundColor Green
$userServiceProcess = Start-Service -Name "User Service" -WorkingDirectory "services/user-service" -Command "node" -Arguments "src/index.js"

# Wait for User Service to initialize
Write-Host "Waiting for User Service to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start API Gateway
Write-Host "Starting API Gateway..." -ForegroundColor Green
$apiGatewayProcess = Start-Service -Name "API Gateway" -WorkingDirectory "services/api-gateway" -Command "node" -Arguments "src/index.js"

# Wait for API Gateway to initialize
Write-Host "Waiting for API Gateway to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Green
$frontendProcess = Start-Service -Name "Frontend" -WorkingDirectory "frontend/admin-panel" -Command "npm" -Arguments "start"

# Summary
Write-Host "All services started successfully!" -ForegroundColor Green
Write-Host "User Service running with PID: $($userServiceProcess.Id)" -ForegroundColor Cyan
Write-Host "API Gateway running with PID: $($apiGatewayProcess.Id)" -ForegroundColor Cyan
Write-Host "Frontend running with PID: $($frontendProcess.Id)" -ForegroundColor Cyan
Write-Host "Logs are being saved to the logs directory." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Red

# Keep the script running to maintain the processes
try {
    while ($true) {
        Start-Sleep -Seconds 10
        
        # Check if services are still running
        if ($userServiceProcess -and $userServiceProcess.HasExited) {
            Write-Log -Service "System" -Message "User Service exited with code $($userServiceProcess.ExitCode)" -Level "ERROR"
            Write-Log -Service "System" -Message "Restarting User Service in 5 seconds..." -Level "WARN"
            Start-Sleep -Seconds 5
            Write-Log -Service "System" -Message "Starting User Service..."
            $userServiceProcess = Start-Service -Name "User Service" -WorkingDirectory "services/user-service" -Command "node" -Arguments "src/index.js"
        }
        
        if ($apiGatewayProcess -and $apiGatewayProcess.HasExited) {
            Write-Log -Service "System" -Message "API Gateway exited with code $($apiGatewayProcess.ExitCode)" -Level "ERROR"
            Write-Log -Service "System" -Message "Restarting API Gateway in 5 seconds..." -Level "WARN"
            Start-Sleep -Seconds 5
            Write-Log -Service "System" -Message "Starting API Gateway..."
            $apiGatewayProcess = Start-Service -Name "API Gateway" -WorkingDirectory "services/api-gateway" -Command "node" -Arguments "src/index.js"
        }
        
        if ($frontendProcess -and $frontendProcess.HasExited) {
            Write-Log -Service "System" -Message "Frontend exited with code $($frontendProcess.ExitCode)" -Level "ERROR"
            Write-Log -Service "System" -Message "Restarting Frontend in 5 seconds..." -Level "WARN"
            Start-Sleep -Seconds 5
            Write-Log -Service "System" -Message "Starting Frontend..."
            $frontendProcess = Start-Service -Name "Frontend" -WorkingDirectory "frontend/admin-panel" -Command "npm" -Arguments "start"
        }
    }
}
finally {
    # Clean up processes when the script is terminated
    if ($userServiceProcess -and -not $userServiceProcess.HasExited) {
        Write-Log -Service "System" -Message "Stopping User Service..."
        Stop-Process -Id $userServiceProcess.Id -Force
    }
    
    if ($apiGatewayProcess -and -not $apiGatewayProcess.HasExited) {
        Write-Log -Service "System" -Message "Stopping API Gateway..."
        Stop-Process -Id $apiGatewayProcess.Id -Force
    }
    
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Write-Log -Service "System" -Message "Stopping Frontend..."
        Stop-Process -Id $frontendProcess.Id -Force
    }
    
    Write-Log -Service "System" -Message "All services stopped"
    Write-Host "All services stopped" -ForegroundColor Green
} 