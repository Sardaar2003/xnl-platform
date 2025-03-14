const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const Account = require('../models/account.model');

// Mock data
const testAccount = {
  userId: 'testuser123',
  accountType: 'SAVINGS',
  name: 'Test Savings Account',
  currency: 'USD',
  description: 'Test account for unit tests'
};

// Connect to test database before tests
beforeAll(async () => {
  const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/xnl-account-service-test';
  await mongoose.connect(url);
});

// Clear database between tests
beforeEach(async () => {
  await Account.deleteMany({});
});

// Disconnect after tests
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Account API', () => {
  describe('POST /api/accounts', () => {
    it('should create a new account', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send(testAccount);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.userId).toEqual(testAccount.userId);
      expect(res.body.data.accountType).toEqual(testAccount.accountType);
      expect(res.body.data.balance).toEqual(0);
      expect(res.body.data.status).toEqual('ACTIVE');
    });

    it('should not create account with missing required fields', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({ userId: 'testuser123' });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
    });

    it('should not allow duplicate account types for same user', async () => {
      // Create first account
      await request(app)
        .post('/api/accounts')
        .send(testAccount);
      
      // Try to create duplicate
      const res = await request(app)
        .post('/api/accounts')
        .send(testAccount);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
      expect(res.body.message).toContain('already has an active');
    });
  });

  describe('GET /api/accounts/user/:userId', () => {
    it('should get all accounts for a user', async () => {
      // Create test account
      await request(app)
        .post('/api/accounts')
        .send(testAccount);
      
      // Create second account for same user
      await request(app)
        .post('/api/accounts')
        .send({
          ...testAccount,
          accountType: 'CHECKING',
          name: 'Test Checking Account'
        });
      
      const res = await request(app)
        .get(`/api/accounts/user/${testAccount.userId}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.results).toEqual(2);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('should return empty array if user has no accounts', async () => {
      const res = await request(app)
        .get('/api/accounts/user/nonexistentuser');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.results).toEqual(0);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('should get account by ID', async () => {
      // Create test account
      const createRes = await request(app)
        .post('/api/accounts')
        .send(testAccount);
      
      const accountId = createRes.body.data._id;
      
      const res = await request(app)
        .get(`/api/accounts/${accountId}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data._id).toEqual(accountId);
    });

    it('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .get('/api/accounts/60f7a7b5c9b4e52b3c7a1234');
      
      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toEqual('error');
    });
  });

  describe('PATCH /api/accounts/:id', () => {
    it('should update account details', async () => {
      // Create test account
      const createRes = await request(app)
        .post('/api/accounts')
        .send(testAccount);
      
      const accountId = createRes.body.data._id;
      
      const updateData = {
        name: 'Updated Account Name',
        description: 'Updated description'
      };
      
      const res = await request(app)
        .patch(`/api/accounts/${accountId}`)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.name).toEqual(updateData.name);
      expect(res.body.data.description).toEqual(updateData.description);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should close an account', async () => {
      // Create test account
      const createRes = await request(app)
        .post('/api/accounts')
        .send(testAccount);
      
      const accountId = createRes.body.data._id;
      
      const res = await request(app)
        .delete(`/api/accounts/${accountId}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.status).toEqual('CLOSED');
      expect(res.body.data.closedAt).toBeDefined();
    });

    it('should not close account with positive balance', async () => {
      // Create test account
      const createRes = await request(app)
        .post('/api/accounts')
        .send(testAccount);
      
      const accountId = createRes.body.data._id;
      
      // Manually update balance (in a real app this would be done through transactions)
      const account = await Account.findById(accountId);
      account.balance = 100;
      await account.save();
      
      const res = await request(app)
        .delete(`/api/accounts/${accountId}`);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
      expect(res.body.message).toContain('positive balance');
    });
  });
}); 