const promClient = require('prom-client');
const logger = require('../utils/logger');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add a default label to all metrics
register.setDefaultLabels({
  app: process.env.SERVICE_NAME || 'unknown-service'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [register]
});

const databaseOperationsTotal = new promClient.Counter({
  name: 'database_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'collection', 'status'],
  registers: [register]
});

const rabbitmqMessagesTotal = new promClient.Counter({
  name: 'rabbitmq_messages_total',
  help: 'Total number of RabbitMQ messages',
  labelNames: ['type', 'queue', 'status'],
  registers: [register]
});

// Middleware to track HTTP requests
const metricsMiddleware = (req, res, next) => {
  // Record start time
  const start = Date.now();
  
  // Add response hook to record metrics after response is sent
  const originalEnd = res.end;
  res.end = function() {
    // Call the original end function
    originalEnd.apply(res, arguments);
    
    // Record metrics
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    
    // Increment request counter
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    
    // Record request duration
    httpRequestDurationMicroseconds.observe(
      { method, route, status_code: statusCode },
      duration
    );
  };
  
  next();
};

// Endpoint to expose metrics
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error('Error generating metrics:', err);
    res.status(500).end();
  }
};

// Helper functions to record database and RabbitMQ metrics
const recordDatabaseOperation = (operation, collection, status = 'success') => {
  databaseOperationsTotal.inc({ operation, collection, status });
};

const recordRabbitMQMessage = (type, queue, status = 'success') => {
  rabbitmqMessagesTotal.inc({ type, queue, status });
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  recordDatabaseOperation,
  recordRabbitMQMessage
}; 