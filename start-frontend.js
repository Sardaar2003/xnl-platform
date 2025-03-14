// Script to start the frontend
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting frontend...');

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Path to frontend
const frontendPath = path.join(__dirname, 'frontend', 'admin-panel');

// Use npx instead of npm directly
const frontend = spawn('npx', ['--no-install', 'react-scripts', 'start'], {
  cwd: frontendPath,
  stdio: 'pipe',
  shell: true, // Use shell to ensure command is found
  env: {
    ...process.env,
    PORT: 3000,
    BROWSER: 'none' // Don't open browser automatically
  }
});

// Create log streams
const stdout = fs.createWriteStream(path.join(__dirname, 'logs', 'frontend-stdout.log'));
const stderr = fs.createWriteStream(path.join(__dirname, 'logs', 'frontend-stderr.log'));

// Pipe output to logs
frontend.stdout.pipe(stdout);
frontend.stderr.pipe(stderr);

// Also log to console
frontend.stdout.on('data', (data) => {
  console.log(`Frontend: ${data}`);
});

frontend.stderr.on('data', (data) => {
  console.error(`Frontend error: ${data}`);
});

frontend.on('close', (code) => {
  console.log(`Frontend exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping frontend...');
  frontend.kill();
  process.exit();
}); 