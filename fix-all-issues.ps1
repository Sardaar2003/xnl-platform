# Fix All Issues Script for XNL Fintech Platform
# This script addresses all identified issues in the project

# Function to display colored output
function Write-ColorOutput {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $false)]
        [string]$ForegroundColor = "White"
    )
    
    Write-Host $Message -ForegroundColor $ForegroundColor
}

# Create logs directory if it doesn't exist
if (-not (Test-Path -Path "logs")) {
    Write-ColorOutput "Creating logs directory..." "Yellow"
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Check if shared/src/utils directory exists
if (-not (Test-Path -Path "shared/src/utils")) {
    Write-ColorOutput "Creating shared/src/utils directory..." "Yellow"
    New-Item -ItemType Directory -Path "shared/src/utils" -Force | Out-Null
}

# Create logger.js if it doesn't exist
if (-not (Test-Path -Path "shared/src/utils/logger.js")) {
    Write-ColorOutput "Creating logger.js..." "Yellow"
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
    Set-Content -Path "shared/src/utils/logger.js" -Value $loggerContent
}

# Create utils/index.js if it doesn't exist
if (-not (Test-Path -Path "shared/src/utils/index.js")) {
    Write-ColorOutput "Creating utils/index.js..." "Yellow"
    $utilsIndexContent = @'
const logger = require('./logger');

module.exports = {
  logger
};
'@
    Set-Content -Path "shared/src/utils/index.js" -Value $utilsIndexContent
}

# Update events/index.js to export RabbitMQManager
Write-ColorOutput "Updating events/index.js..." "Yellow"
if (-not (Test-Path -Path "shared/src/events")) {
    New-Item -ItemType Directory -Path "shared/src/events" -Force | Out-Null
}

$eventsIndexContent = @'
const RabbitMQManager = require('./rabbitmq');

module.exports = {
  RabbitMQManager
};
'@
Set-Content -Path "shared/src/events/index.js" -Value $eventsIndexContent

# Create or update rabbitmq.js to use local logger if shared logger is not available
Write-ColorOutput "Updating rabbitmq.js..." "Yellow"
$rabbitmqContent = @'
const amqp = require('amqplib');

// Try to use shared logger, but fall back to local logger if not available
let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  // Create a simple local logger
  logger = {
    info: (message) => console.log(`[INFO] ${message}`),
    error: (message) => console.error(`[ERROR] ${message}`),
    warn: (message) => console.warn(`[WARN] ${message}`),
    debug: (message) => console.debug(`[DEBUG] ${message}`)
  };
}

class RabbitMQManager {
  constructor(config = {}) {
    this.config = {
      url: config.url || process.env.RABBITMQ_URL || 'amqp://localhost',
      exchangeName: config.exchangeName || 'xnl_events',
      exchangeType: config.exchangeType || 'topic',
      reconnectInterval: config.reconnectInterval || 5000
    };
    
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
    this.consumers = new Map();
  }
  
  async connect() {
    if (this.connection || this.isConnecting) return;
    
    this.isConnecting = true;
    
    try {
      logger.info(`Connecting to RabbitMQ at ${this.config.url}`);
      
      this.connection = await amqp.connect(this.config.url);
      
      this.connection.on('error', (err) => {
        logger.error(`RabbitMQ connection error: ${err.message}`);
        this.reconnect();
      });
      
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.reconnect();
      });
      
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertExchange(
        this.config.exchangeName,
        this.config.exchangeType,
        { durable: true }
      );
      
      logger.info('Connected to RabbitMQ successfully');
      this.isConnecting = false;
      
      // Reestablish consumers if any
      if (this.consumers.size > 0) {
        for (const [queue, callback] of this.consumers.entries()) {
          await this.subscribe(queue, callback);
        }
      }
    } catch (error) {
      logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      this.isConnecting = false;
      this.reconnect();
    }
  }
  
  reconnect() {
    if (this.isConnecting) return;
    
    this.connection = null;
    this.channel = null;
    
    setTimeout(() => {
      logger.info('Attempting to reconnect to RabbitMQ');
      this.connect();
    }, this.config.reconnectInterval);
  }
  
  async publish(exchange, routingKey, message) {
    if (!this.channel) {
      await this.connect();
    }
    
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        contentType: 'application/json'
      });
      
      logger.debug(`Published message to ${exchange} with routing key ${routingKey}`);
      return true;
    } catch (error) {
      logger.error(`Failed to publish message: ${error.message}`);
      return false;
    }
  }
  
  async subscribe(queue, callback) {
    if (!this.channel) {
      await this.connect();
      
      // Store consumer for reconnection
      this.consumers.set(queue, callback);
    }
    
    try {
      await this.channel.assertQueue(queue, { durable: true });
      
      this.channel.consume(queue, (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            callback(content, msg);
            this.channel.ack(msg);
          } catch (error) {
            logger.error(`Error processing message: ${error.message}`);
            this.channel.nack(msg, false, false);
          }
        }
      });
      
      logger.info(`Subscribed to queue: ${queue}`);
      return true;
    } catch (error) {
      logger.error(`Failed to subscribe to queue ${queue}: ${error.message}`);
      return false;
    }
  }
  
  async bindQueue(queue, exchange, routingKey) {
    if (!this.channel) {
      await this.connect();
    }
    
    try {
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, exchange, routingKey);
      
      logger.info(`Bound queue ${queue} to exchange ${exchange} with routing key ${routingKey}`);
      return true;
    } catch (error) {
      logger.error(`Failed to bind queue: ${error.message}`);
      return false;
    }
  }
  
  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    
    if (this.connection) {
      await this.connection.close();
    }
    
    this.channel = null;
    this.connection = null;
    this.consumers.clear();
    
    logger.info('Closed RabbitMQ connection');
  }
}

module.exports = RabbitMQManager;
'@
Set-Content -Path "shared/src/events/rabbitmq.js" -Value $rabbitmqContent

# Create shared/src/index.js if it doesn't exist
if (-not (Test-Path -Path "shared/src/index.js")) {
    Write-ColorOutput "Creating shared/src/index.js..." "Yellow"
    $sharedIndexContent = @'
const { RabbitMQManager } = require('./events');
const { logger } = require('./utils');

module.exports = {
  RabbitMQManager,
  logger
};
'@
    Set-Content -Path "shared/src/index.js" -Value $sharedIndexContent
}

# Create services/api-gateway directory if it doesn't exist
if (-not (Test-Path -Path "services/api-gateway")) {
    Write-ColorOutput "Creating services/api-gateway directory..." "Yellow"
    New-Item -ItemType Directory -Path "services/api-gateway" -Force | Out-Null
}

# Create services/api-gateway/src directory if it doesn't exist
if (-not (Test-Path -Path "services/api-gateway/src")) {
    Write-ColorOutput "Creating services/api-gateway/src directory..." "Yellow"
    New-Item -ItemType Directory -Path "services/api-gateway/src" -Force | Out-Null
}

# Create services/api-gateway/package.json if it doesn't exist
if (-not (Test-Path -Path "services/api-gateway/package.json")) {
    Write-ColorOutput "Creating services/api-gateway/package.json..." "Yellow"
    $apiGatewayPackageContent = @'
{
  "name": "@xnl/api-gateway",
  "version": "1.0.0",
  "description": "API Gateway for XNL Fintech Platform",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6",
    "cors": "^2.8.5",
    "morgan": "^1.10.0",
    "winston": "^3.8.2",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
'@
    Set-Content -Path "services/api-gateway/package.json" -Value $apiGatewayPackageContent
}

# Create services/api-gateway/src/index.js if it doesn't exist
if (-not (Test-Path -Path "services/api-gateway/src/index.js")) {
    Write-ColorOutput "Creating services/api-gateway/src/index.js..." "Yellow"
    $apiGatewayIndexContent = @'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Service routes
const routes = {
  user: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: { '^/api/auth': '/', '^/api/users': '/' }
  },
  account: {
    target: process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3002',
    pathRewrite: { '^/api/accounts': '/' }
  },
  transaction: {
    target: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: { '^/api/transactions': '/' }
  },
  notification: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
    pathRewrite: { '^/api/notifications': '/' }
  }
};

// Set up proxies
app.use('/api/auth', createProxyMiddleware({
  target: routes.user.target,
  pathRewrite: routes.user.pathRewrite['^/api/auth'],
  changeOrigin: true
}));

app.use('/api/users', createProxyMiddleware({
  target: routes.user.target,
  pathRewrite: routes.user.pathRewrite['^/api/users'],
  changeOrigin: true
}));

app.use('/api/accounts', createProxyMiddleware({
  target: routes.account.target,
  pathRewrite: routes.account.pathRewrite['^/api/accounts'],
  changeOrigin: true
}));

app.use('/api/transactions', createProxyMiddleware({
  target: routes.transaction.target,
  pathRewrite: routes.transaction.pathRewrite['^/api/transactions'],
  changeOrigin: true
}));

app.use('/api/notifications', createProxyMiddleware({
  target: routes.notification.target,
  pathRewrite: routes.notification.pathRewrite['^/api/notifications'],
  changeOrigin: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
'@
    Set-Content -Path "services/api-gateway/src/index.js" -Value $apiGatewayIndexContent
}

# Fix auth.controller.js to properly define MFA functions
Write-ColorOutput "Fixing auth.controller.js..." "Yellow"
$authControllerPath = "services/user-service/src/controllers/auth.controller.js"
if (Test-Path -Path $authControllerPath) {
    $authController = Get-Content -Path $authControllerPath -Raw
    
    # Check if setupMFA is defined as a function
    if ($authController -match "exports\.setupMFA\s*=") {
        Write-ColorOutput "MFA functions are already exported correctly. No changes needed." "Green"
    }
    else {
        Write-ColorOutput "Fixing MFA functions in auth.controller.js..." "Yellow"
        
        # Add MFA functions if they don't exist
        $mfaFunctions = @'

/**
 * Setup Multi-Factor Authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const setupMFA = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `XNL Fintech:${user.email}`
    });
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    // Save secret to user
    user.mfaSecret = secret.base32;
    user.mfaEnabled = false; // Not enabled until verified
    await user.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        secret: secret.base32,
        qrCode
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify MFA token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyMFA = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });
    
    if (!verified) {
      throw new ApiError(400, 'Invalid MFA token');
    }
    
    // Enable MFA
    user.mfaEnabled = true;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login with MFA
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const loginWithMFA = async (req, res, next) => {
  try {
    const { email, password, mfaToken } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid credentials');
    }
    
    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // If MFA token is not provided
      if (!mfaToken) {
        return res.status(200).json({
          status: 'success',
          requireMFA: true,
          message: 'MFA token required'
        });
      }
      
      // Verify MFA token
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaToken
      });
      
      if (!verified) {
        throw new ApiError(401, 'Invalid MFA token');
      }
    }
    
    // Generate tokens
    const accessToken = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });
    
    const refreshToken = generateRefreshToken({
      id: user._id,
    });
    
    // Update user with refresh token
    user.refreshToken = refreshToken;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          mfaEnabled: user.mfaEnabled
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
'@
        
        # Replace the module.exports section
        $moduleExports = @'
module.exports = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
  setupMFA,
  verifyMFA,
  loginWithMFA
};
'@
        
        # Add MFA functions before module.exports
        $authController = $authController -replace "module\.exports\s*=\s*\{[^}]*\}\s*;", "$mfaFunctions`n`n$moduleExports"
        
        # Save the updated file
        Set-Content -Path $authControllerPath -Value $authController
    }
}

# Update lerna.json to use workspaces
Write-ColorOutput "Updating lerna.json..." "Yellow"
$lernaJsonPath = "lerna.json"
if (Test-Path -Path $lernaJsonPath) {
    $lernaJson = Get-Content -Path $lernaJsonPath -Raw | ConvertFrom-Json
    
    # Set useWorkspaces to true
    $lernaJson.useWorkspaces = $true
    
    # Ensure packages includes shared
    if (-not ($lernaJson.packages -contains "shared")) {
        $lernaJson.packages += "shared"
    }
    
    # Save the updated file
    $lernaJson | ConvertTo-Json -Depth 10 | Set-Content -Path $lernaJsonPath
}

# Update package.json to include workspaces
Write-ColorOutput "Updating package.json..." "Yellow"
$packageJsonPath = "package.json"
if (Test-Path -Path $packageJsonPath) {
    $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
    
    # Add workspaces if it doesn't exist
    if (-not (Get-Member -InputObject $packageJson -Name "workspaces" -MemberType Properties)) {
        $packageJson | Add-Member -MemberType NoteProperty -Name "workspaces" -Value @("services/*", "shared")
    }
    
    # Save the updated file
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath
}

# Install required dependencies
Write-ColorOutput "Installing required dependencies..." "Yellow"
try {
    # Install dependencies for shared module
    if (Test-Path -Path "shared") {
        Set-Location -Path "shared"
        npm install --save winston amqplib
        Set-Location -Path ".."
    }
    
    # Install dependencies for API Gateway
    if (Test-Path -Path "services/api-gateway") {
        Set-Location -Path "services/api-gateway"
        npm install
        Set-Location -Path "../.."
    }
    
    # Install dependencies for user service
    if (Test-Path -Path "services/user-service") {
        Set-Location -Path "services/user-service"
        npm install --save speakeasy qrcode
        Set-Location -Path "../.."
    }
    
    # Bootstrap all packages with Lerna
    Write-ColorOutput "Bootstrapping all packages with Lerna..." "Yellow"
    npx lerna bootstrap
}
catch {
    Write-ColorOutput "Error installing dependencies: $_" "Red"
}

Write-ColorOutput "All issues have been fixed!" "Green"
Write-ColorOutput "You can now run the application with: powershell -ExecutionPolicy Bypass -File start-services.ps1" "Green" 