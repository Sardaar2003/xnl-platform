#!/usr/bin/env node

/**
 * This script sets up Lerna for managing the microservices in the XNL Fintech Platform.
 * It ensures all services are properly configured with the correct dependencies and scripts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Define the services directory
const servicesDir = path.join(__dirname, '..', 'services');

// Common dependencies for all services
const commonDependencies = {
  "express": "^4.18.2",
  "mongoose": "^7.0.3",
  "dotenv": "^16.0.3",
  "cors": "^2.8.5",
  "helmet": "^6.1.5",
  "jsonwebtoken": "^9.0.0",
  "winston": "^3.8.2",
  "amqplib": "^0.10.3",
  "uuid": "^9.0.0",
  "joi": "^17.9.1",
  "axios": "^1.3.5"
};

// Common dev dependencies for all services
const commonDevDependencies = {
  "jest": "^29.5.0",
  "supertest": "^6.3.3",
  "nodemon": "^2.0.22",
  "eslint": "^8.38.0",
  "eslint-config-prettier": "^8.8.0",
  "prettier": "^2.8.7"
};

// Common scripts for all services
const commonScripts = {
  "start": "node src/index.js",
  "dev": "nodemon src/index.js",
  "test": "jest --detectOpenHandles",
  "lint": "eslint .",
  "format": "prettier --write \"**/*.{js,json,md}\""
};

// Service-specific dependencies
const serviceSpecificDependencies = {
  "user-service": {
    "bcryptjs": "^2.4.3",
    "nodemailer": "^6.9.1",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.1"
  },
  "account-service": {
    "decimal.js": "^10.4.3"
  },
  "transaction-service": {
    "moment": "^2.29.4",
    "cron": "^2.3.0"
  },
  "notification-service": {
    "ws": "^8.13.0",
    "twilio": "^4.10.0",
    "redis": "^4.6.5",
    "firebase-admin": "^11.7.0"
  }
};

// Function to ensure a directory exists
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(chalk.green(`Created directory: ${dir}`));
  }
}

// Function to update package.json for a service
function updatePackageJson(serviceName) {
  const packageJsonPath = path.join(servicesDir, serviceName, 'package.json');
  let packageJson = {};

  // Create or read package.json
  if (fs.existsSync(packageJsonPath)) {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } else {
    packageJson = {
      name: serviceName,
      version: "1.0.0",
      description: `XNL Fintech Platform - ${serviceName}`,
      main: "src/index.js",
      private: true
    };
  }

  // Update scripts
  packageJson.scripts = { ...commonScripts, ...(packageJson.scripts || {}) };

  // Update dependencies
  packageJson.dependencies = { 
    ...(packageJson.dependencies || {}), 
    ...commonDependencies,
    ...(serviceSpecificDependencies[serviceName] || {})
  };

  // Update dev dependencies
  packageJson.devDependencies = { 
    ...(packageJson.devDependencies || {}), 
    ...commonDevDependencies 
  };

  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(chalk.green(`Updated package.json for ${serviceName}`));
}

// Function to create basic service structure if it doesn't exist
function createServiceStructure(serviceName) {
  const serviceDir = path.join(servicesDir, serviceName);
  ensureDirectoryExists(serviceDir);

  // Create src directory and subdirectories
  const srcDir = path.join(serviceDir, 'src');
  ensureDirectoryExists(srcDir);
  ensureDirectoryExists(path.join(srcDir, 'controllers'));
  ensureDirectoryExists(path.join(srcDir, 'models'));
  ensureDirectoryExists(path.join(srcDir, 'routes'));
  ensureDirectoryExists(path.join(srcDir, 'middleware'));
  ensureDirectoryExists(path.join(srcDir, 'utils'));
  ensureDirectoryExists(path.join(srcDir, 'config'));

  // Create test directory
  ensureDirectoryExists(path.join(serviceDir, 'tests'));

  // Create basic index.js if it doesn't exist
  const indexPath = path.join(srcDir, 'index.js');
  if (!fs.existsSync(indexPath)) {
    const indexContent = `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Set up middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xnl-${serviceName}')
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error(\`MongoDB connection error: \${error.message}\`);
    process.exit(1);
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: '${serviceName}',
    uptime: process.uptime()
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(\`${serviceName} running on port \${PORT}\`);
});

module.exports = app;`;

    fs.writeFileSync(indexPath, indexContent);
    console.log(chalk.green(`Created basic index.js for ${serviceName}`));
  }

  // Create .env file if it doesn't exist
  const envPath = path.join(serviceDir, '.env');
  if (!fs.existsSync(envPath)) {
    const envContent = `# ${serviceName} Environment Variables
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/xnl-${serviceName}
JWT_SECRET=your_jwt_secret
RABBITMQ_URL=amqp://localhost:5672
`;

    fs.writeFileSync(envPath, envContent);
    console.log(chalk.green(`Created .env file for ${serviceName}`));
  }

  // Create .gitignore if it doesn't exist
  const gitignorePath = path.join(serviceDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    const gitignoreContent = `# Node.js
node_modules/
npm-debug.log
yarn-debug.log
yarn-error.log

# Environment variables
.env
.env.local
.env.development
.env.test
.env.production

# Logs
logs/
*.log

# Coverage directory
coverage/

# Dependency directories
.pnp/
.pnp.js

# Build output
dist/
build/

# Misc
.DS_Store
.idea/
.vscode/
*.swp
*.swo
`;

    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log(chalk.green(`Created .gitignore for ${serviceName}`));
  }
}

// Main function to set up Lerna
async function setupLerna() {
  try {
    console.log(chalk.blue('Setting up Lerna for XNL Fintech Platform...'));

    // Ensure services directory exists
    ensureDirectoryExists(servicesDir);

    // Define services
    const services = [
      'user-service',
      'account-service',
      'transaction-service',
      'notification-service'
    ];

    // Set up each service
    for (const service of services) {
      console.log(chalk.blue(`Setting up ${service}...`));
      createServiceStructure(service);
      updatePackageJson(service);
    }

    // Install dependencies using Lerna
    console.log(chalk.blue('Installing dependencies with Lerna...'));
    execSync('npx lerna bootstrap', { stdio: 'inherit' });

    console.log(chalk.green('Lerna setup completed successfully!'));
    console.log(chalk.yellow('You can now run the following commands:'));
    console.log(chalk.yellow('  - npm run bootstrap: Install all dependencies'));
    console.log(chalk.yellow('  - npm run start: Start all services'));
    console.log(chalk.yellow('  - npm run test: Run tests for all services'));
    console.log(chalk.yellow('  - npm run lint: Lint all services'));
  } catch (error) {
    console.error(chalk.red('Error setting up Lerna:'), error);
    process.exit(1);
  }
}

// Run the setup
setupLerna(); 