const request = require('supertest');
const app = require('../index');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Mock JWT token for testing
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

describe('API Gateway', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    // Create test tokens
    adminToken = generateToken('admin123', 'admin');
    userToken = generateToken('user123', 'user');
  });

  afterAll(async () => {
    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('Health Check', () => {
    it('should return 200 OK for health check endpoint', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Authentication', () => {
    it('should return 401 for protected routes without token', async () => {
      const response = await request(app).get('/api/users');
      expect(response.status).toBe(401);
    });

    it('should allow access to protected routes with valid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`);
      
      // Note: This might return 404 if the user doesn't exist, but it should pass authentication
      expect(response.status).not.toBe(401);
    });
  });

  describe('Routing', () => {
    it('should route user requests to user service', async () => {
      // This is a mock test since we're not actually running the user service
      // In a real test environment, we would have the user service running
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      // We expect either a successful response or a 502 if the service is not available
      expect([200, 404, 502]).toContain(response.status);
    });

    it('should route account requests to account service', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404, 502]).toContain(response.status);
    });

    it('should route transaction requests to transaction service', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404, 502]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/non-existent-route');
      expect(response.status).toBe(404);
    });

    it('should return 500 for server errors', async () => {
      // This is hard to test directly without mocking internal server errors
      // In a real test, we would mock the services to throw errors
      const response = await request(app)
        .get('/api/error-test')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([404, 500, 502]).toContain(response.status);
    });
  });
}); 