// Script to start all services
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Service configuration
const services = [
  {
    name: 'User Service',
    color: colors.green,
    command: 'node',
    args: ['src/index.js'],
    cwd: path.join(__dirname, 'services', 'user-service'),
    ready: (data) => data.includes('User service running')
  },
  {
    name: 'API Gateway',
    color: colors.blue,
    command: 'node',
    args: ['index.js'],
    cwd: __dirname,
    ready: (data) => data.includes('API Gateway running')
  },
  {
    name: 'Frontend',
    color: colors.magenta,
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['start'],
    cwd: path.join(__dirname, 'frontend', 'admin-panel'),
    ready: (data) => data.includes('Compiled successfully') || data.includes('webpack compiled')
  }
];

// Track running processes
const processes = [];

// Log with timestamp and color
function log(service, message, color = colors.reset) {
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  console.log(`${color}[${timestamp}] [${service}] ${message}${colors.reset}`);
}

// Start a service
function startService(service) {
  log('System', `Starting ${service.name}...`, colors.yellow);
  
  const process = spawn(service.command, service.args, {
    cwd: service.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });
  
  process.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(service.name, output, service.color);
      
      // Check if service is ready
      if (service.ready && service.ready(output) && !service.isReady) {
        service.isReady = true;
        log('System', `${service.name} is ready!`, colors.cyan);
      }
    }
  });
  
  process.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(service.name, `ERROR: ${output}`, colors.red);
    }
  });
  
  process.on('error', (error) => {
    log('System', `Error starting ${service.name}: ${error.message}`, colors.red);
  });
  
  process.on('close', (code) => {
    log('System', `${service.name} exited with code ${code}`, colors.yellow);
    
    // Remove from processes array
    const index = processes.indexOf(process);
    if (index > -1) {
      processes.splice(index, 1);
    }
    
    // Restart service if it crashes
    if (code !== 0 && !service.stopping) {
      log('System', `Restarting ${service.name} in 5 seconds...`, colors.yellow);
      setTimeout(() => {
        startService(service);
      }, 5000);
    }
  });
  
  processes.push(process);
  service.process = process;
  
  return process;
}

// Start all services
async function startAllServices() {
  log('System', 'Starting all services...', colors.cyan);
  
  // Start services in sequence
  for (const service of services) {
    startService(service);
    
    // Wait for service to be ready before starting the next one
    if (service.ready) {
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (service.isReady) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          log('System', `Timeout waiting for ${service.name} to be ready, continuing anyway...`, colors.yellow);
          resolve();
        }, 30000);
      });
    } else {
      // Wait a bit between service starts
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  log('System', 'All services started!', colors.cyan);
}

// Handle process termination
process.on('SIGINT', () => {
  log('System', 'Stopping all services...', colors.yellow);
  
  // Mark all services as stopping
  services.forEach(service => {
    service.stopping = true;
  });
  
  // Kill all processes
  processes.forEach(process => {
    process.kill();
  });
  
  log('System', 'All services stopped!', colors.yellow);
  process.exit(0);
});

// Start all services
startAllServices(); 