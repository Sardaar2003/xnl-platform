# PowerShell script to fix module resolution issues

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

# Create utils directory if it doesn't exist
Write-ColorOutput "Creating utils directory in shared module..." "Yellow"
if (-not (Test-Path -Path "$PSScriptRoot\shared\src\utils")) {
    New-Item -Path "$PSScriptRoot\shared\src\utils" -ItemType Directory -Force
}

# Create logger.js if it doesn't exist
Write-ColorOutput "Creating logger.js in shared module..." "Cyan"
$loggerContent = @'
const winston = require('winston');

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    logFormat
  ),
  defaultMeta: { service: 'xnl-fintech' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // Add file transport for production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ] : [])
  ],
  exitOnError: false
});

// Create a stream object with a write function that will be used by Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
'@

Set-Content -Path "$PSScriptRoot\shared\src\utils\logger.js" -Value $loggerContent

# Create utils/index.js if it doesn't exist
Write-ColorOutput "Creating utils/index.js in shared module..." "Green"
$utilsIndexContent = @'
const logger = require('./logger');

module.exports = {
  logger
};
'@

Set-Content -Path "$PSScriptRoot\shared\src\utils\index.js" -Value $utilsIndexContent

# Update events/index.js to properly export RabbitMQManager
Write-ColorOutput "Updating events/index.js to properly export RabbitMQManager..." "Magenta"
$eventsIndexContent = @'
const RabbitMQManager = require('./rabbitmq');

module.exports = {
  RabbitMQManager
};
'@

Set-Content -Path "$PSScriptRoot\shared\src\events\index.js" -Value $eventsIndexContent

# Update rabbitmq.js to use local logger
Write-ColorOutput "Updating rabbitmq.js to use local logger..." "Blue"
$rabbitmqContent = Get-Content -Path "$PSScriptRoot\shared\src\events\rabbitmq.js" -Raw
$rabbitmqContent = $rabbitmqContent -replace "const logger = require\('\.\.\/utils\/logger'\);", "const winston = require('winston');

// Create a simple logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    })
  ]
});"

Set-Content -Path "$PSScriptRoot\shared\src\events\rabbitmq.js" -Value $rabbitmqContent

# Install required dependencies
Write-ColorOutput "Installing required dependencies..." "Yellow"
Set-Location -Path "$PSScriptRoot"
npm install --save http-proxy-middleware

Set-Location -Path "$PSScriptRoot\services\user-service"
npm install --save speakeasy qrcode

Set-Location -Path "$PSScriptRoot\shared"
npm install --save amqplib winston

# Update lerna.json to use workspaces
Write-ColorOutput "Updating lerna.json to use workspaces..." "Cyan"
$lernaContent = @'
{
  "version": "1.0.0",
  "npmClient": "npm",
  "useWorkspaces": true,
  "packages": [
    "services/*",
    "shared"
  ]
}
'@

Set-Content -Path "$PSScriptRoot\lerna.json" -Value $lernaContent

# Fix auth.controller.js to remove undefined references
Write-ColorOutput "Fixing auth.controller.js to remove undefined references..." "Green"
$authControllerPath = "$PSScriptRoot\services\user-service\src\controllers\auth.controller.js"
$authControllerContent = Get-Content -Path $authControllerPath -Raw
$authControllerContent = $authControllerContent -replace "googleAuth,", "// googleAuth,"
$authControllerContent = $authControllerContent -replace "facebookAuth,", "// facebookAuth,"
$authControllerContent = $authControllerContent -replace "appleAuth,", "// appleAuth,"
Set-Content -Path $authControllerPath -Value $authControllerContent

# Bootstrap all packages with Lerna
Write-ColorOutput "Bootstrapping all packages with Lerna..." "Blue"
Set-Location -Path "$PSScriptRoot"
npx lerna bootstrap

Write-ColorOutput "Module resolution issues fixed! You can now run the application with 'powershell -ExecutionPolicy Bypass -File start-services.ps1'" "Green" 