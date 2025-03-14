// Script to start the user service
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting user service...');

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Path to user service
const userServicePath = path.join(__dirname, 'services', 'user-service');

// Start user service
const userService = spawn('node', ['src/index.js'], {
  cwd: userServicePath,
  stdio: 'pipe'
});

// Create log streams
const stdout = fs.createWriteStream(path.join(__dirname, 'logs', 'user-service-stdout.log'));
const stderr = fs.createWriteStream(path.join(__dirname, 'logs', 'user-service-stderr.log'));

// Pipe output to logs
userService.stdout.pipe(stdout);
userService.stderr.pipe(stderr);

// Also log to console
userService.stdout.on('data', (data) => {
  console.log(`User service: ${data}`);
});

userService.stderr.on('data', (data) => {
  console.error(`User service error: ${data}`);
});

userService.on('close', (code) => {
  console.log(`User service exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping user service...');
  userService.kill();
  process.exit();
}); 