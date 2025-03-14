# PowerShell script to set up the project

# Function to display colored output
function Write-ColorOutput {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $false)]
        [string]$ForegroundColor = "White"
    )
    
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $originalColor
}

# Install root dependencies
Write-ColorOutput "Installing root dependencies..." "Yellow"
npm install

# Install shared module dependencies
Write-ColorOutput "Installing shared module dependencies..." "Cyan"
Set-Location -Path "$PSScriptRoot\shared"
npm install
Set-Location -Path "$PSScriptRoot"

# Install user service dependencies
Write-ColorOutput "Installing user service dependencies..." "Green"
Set-Location -Path "$PSScriptRoot\services\user-service"
npm install
Set-Location -Path "$PSScriptRoot"

# Install API gateway dependencies
Write-ColorOutput "Installing API gateway dependencies..." "Magenta"
npm install http-proxy-middleware

# Bootstrap all packages with Lerna
Write-ColorOutput "Bootstrapping all packages with Lerna..." "Blue"
npx lerna bootstrap

Write-ColorOutput "Setup complete! You can now run the application with 'powershell -ExecutionPolicy Bypass -File start-services.ps1'" "Green" 