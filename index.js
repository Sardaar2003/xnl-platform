require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');
const winston = require('winston');

// Create a simple logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    })
  ]
});

// Initialize Express app
const app = express();

// Set up middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Service routes
const routes = {
  '/api/auth': 'http://localhost:3001',
  '/api/users': 'http://localhost:3001',
  '/api/accounts': 'http://localhost:3002',
  '/api/transactions': 'http://localhost:3003',
  '/api/notifications': 'http://localhost:3004',
};

// Set up proxy routes
Object.entries(routes).forEach(([route, target]) => {
  app.use(
    route,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${route}`]: '',
      },
      onProxyReq: (proxyReq, req, res) => {
        logger.debug(`Proxying request to ${target}${req.url}`);
      },
    })
  );
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'api-gateway',
    uptime: process.uptime(),
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});
