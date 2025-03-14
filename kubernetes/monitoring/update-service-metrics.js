/**
 * This script updates the index.js files of all services to include the metrics middleware and endpoint
 * Run with: node update-service-metrics.js
 */

const fs = require('fs');
const path = require('path');

// Define the services to update
const SERVICES = ['account-service', 'transaction-service', 'user-service', 'notification-service'];

// Define the metrics middleware import
const METRICS_IMPORT = `const { metricsMiddleware, metricsEndpoint } = require('../common/middleware/metrics.middleware');`;

// Define the metrics middleware usage
const METRICS_MIDDLEWARE = `app.use(metricsMiddleware);`;

// Define the metrics endpoint
const METRICS_ENDPOINT = `// Metrics endpoint for Prometheus
app.get('/metrics', metricsEndpoint);`;

// Process each service
SERVICES.forEach(service => {
  console.log(`Updating ${service} index.js...`);
  
  // Get the index.js file path
  const indexPath = path.resolve(__dirname, `../../services/${service}/src/index.js`);
  
  if (fs.existsSync(indexPath)) {
    // Read the file
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Check if metrics middleware is already imported
    if (!content.includes('metricsMiddleware')) {
      // Add metrics import after the last require statement
      const lastRequireIndex = content.lastIndexOf('require(');
      const lastRequireEndIndex = content.indexOf(';', lastRequireIndex) + 1;
      
      content = content.slice(0, lastRequireEndIndex) + '\n' + METRICS_IMPORT + content.slice(lastRequireEndIndex);
      
      // Add metrics middleware after other middleware
      const helmetIndex = content.indexOf('app.use(helmet());');
      if (helmetIndex !== -1) {
        // Find the end of middleware block
        const middlewareEndIndex = content.indexOf('\n\n', helmetIndex);
        
        content = content.slice(0, middlewareEndIndex) + '\n' + METRICS_MIDDLEWARE + content.slice(middlewareEndIndex);
      }
      
      // Add metrics endpoint before API routes
      const apiRoutesIndex = content.indexOf('// API routes');
      if (apiRoutesIndex !== -1) {
        content = content.slice(0, apiRoutesIndex) + METRICS_ENDPOINT + '\n\n' + content.slice(apiRoutesIndex);
      } else {
        // If no API routes comment, add before health check
        const healthCheckIndex = content.indexOf('// Health check');
        if (healthCheckIndex !== -1) {
          content = content.slice(0, healthCheckIndex) + METRICS_ENDPOINT + '\n\n' + content.slice(healthCheckIndex);
        }
      }
      
      // Write the updated content back to the file
      fs.writeFileSync(indexPath, content);
      console.log(`  Updated ${service} index.js with metrics middleware and endpoint`);
    } else {
      console.log(`  Metrics middleware already exists in ${service}`);
    }
  } else {
    console.log(`  index.js for ${service} not found at ${indexPath}`);
  }
});

console.log('All services updated with metrics middleware and endpoint');
console.log('Please restart your services to apply the changes'); 