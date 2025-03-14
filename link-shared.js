// Script to link the shared package
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Linking shared package...');

try {
  // Navigate to the shared directory
  const sharedDir = path.join(__dirname, 'shared');
  
  // Create a global link
  console.log('Creating global link for shared package...');
  execSync('npm link', { cwd: sharedDir, stdio: 'inherit' });
  
  // Link in each service
  const servicesDir = path.join(__dirname, 'services');
  const services = fs.readdirSync(servicesDir).filter(
    service => fs.statSync(path.join(servicesDir, service)).isDirectory()
  );
  
  services.forEach(service => {
    const serviceDir = path.join(servicesDir, service);
    console.log(`Linking shared package in ${service}...`);
    try {
      execSync('npm link @xnl/shared', { cwd: serviceDir, stdio: 'inherit' });
      console.log(`Successfully linked shared package in ${service}`);
    } catch (error) {
      console.error(`Error linking shared package in ${service}: ${error.message}`);
    }
  });
  
  console.log('Shared package linked successfully');
} catch (error) {
  console.error(`Error linking shared package: ${error.message}`);
} 