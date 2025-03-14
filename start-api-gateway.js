// Script to start the API gateway
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting API gateway...');

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Path to API gateway
const apiGatewayPath = path.join(__dirname, 'services', 'api-gateway');

// Start API gateway
const apiGateway = spawn('node', ['src/index.js'], {
  cwd: apiGatewayPath,
  stdio: 'pipe'
});

// Create log streams
const stdout = fs.createWriteStream(path.join(__dirname, 'logs', 'api-gateway-stdout.log'));
const stderr = fs.createWriteStream(path.join(__dirname, 'logs', 'api-gateway-stderr.log'));

// Pipe output to logs
apiGateway.stdout.pipe(stdout);
apiGateway.stderr.pipe(stderr);

// Also log to console
apiGateway.stdout.on('data', (data) => {
  console.log(`API gateway: ${data}`);
});

apiGateway.stderr.on('data', (data) => {
  console.error(`API gateway error: ${data}`);
});

apiGateway.on('close', (code) => {
  console.log(`API gateway exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping API gateway...');
  apiGateway.kill();
  process.exit();
}); 