const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('combined'));

// Service routes
const routes = {
  user: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: { '^/api/auth': '/api/auth', '^/api/users': '/api/users' }
  },
  account: {
    target: process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3002',
    pathRewrite: { '^/api/accounts': '/api/accounts' }
  },
  transaction: {
    target: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: { '^/api/transactions': '/api/transactions' }
  },
  notification: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
    pathRewrite: { '^/api/notifications': '/api/notifications' }
  }
};

// Set up proxies
app.use('/api/auth', createProxyMiddleware({
  target: routes.user.target,
  changeOrigin: true,
  pathRewrite: null,
  logLevel: 'debug',
  timeout: 30000, // 30 seconds timeout
  proxyTimeout: 30000, // 30 seconds proxy timeout
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.writeHead(500, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({ status: 'error', message: 'Proxy error', error: err.message }));
  }
}));

app.use('/api/users', createProxyMiddleware({
  target: routes.user.target,
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/api/users' },
  logLevel: 'debug'
}));

app.use('/api/accounts', createProxyMiddleware({
  target: routes.account.target,
  changeOrigin: true,
  logLevel: 'debug'
}));

app.use('/api/transactions', createProxyMiddleware({
  target: routes.transaction.target,
  changeOrigin: true,
  logLevel: 'debug'
}));

app.use('/api/notifications', createProxyMiddleware({
  target: routes.notification.target,
  changeOrigin: true,
  logLevel: 'debug'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
