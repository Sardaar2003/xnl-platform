const axios = require('axios');
require('dotenv').config();

const services = [
  { name: 'API Gateway', url: 'http://localhost:3000/health' },
  { name: 'User Service', url: 'http://localhost:3001/health' },
  { name: 'Account Service', url: 'http://localhost:3002/health' },
  { name: 'Transaction Service', url: 'http://localhost:3003/health' },
  { name: 'Notification Service', url: 'http://localhost:3004/health' },
];

async function checkHealth() {
  console.log('Checking health of all services...');
  console.log('-----------------------------------');

  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      if (response.status === 200) {
        console.log(`✅ ${service.name}: Healthy`);
        console.log(`   Uptime: ${response.data.uptime} seconds`);
      } else {
        console.log(`❌ ${service.name}: Unhealthy (Status: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${service.name}: Unhealthy (${error.message})`);
    }
    console.log('-----------------------------------');
  }
}

checkHealth();