const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../index');
const Transaction = require('../models/transaction.model');

// Mock data
const testTransaction = {
  sourceAccountId: 'account123',
  destinationAccountId: 'account456',
  type: 'TRANSFER',
  amount: 100.50,
  currency: 'USD',
  description: 'Test transaction'
};

// Connect to test database before tests
beforeAll(async () => {
  const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/xnl-transaction-service-test';
  await mongoose.connect(url);
});

// Clear database between tests
beforeEach(async () => {
  await Transaction.deleteMany({});
});

// Disconnect after tests
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Transaction API', () => {
  describe('POST /api/transactions', () => {
    it('should create a new transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send(testTransaction);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data).toHaveProperty('transactionId');
      expect(res.body.data.sourceAccountId).toEqual(testTransaction.sourceAccountId);
      expect(res.body.data.destinationAccountId).toEqual(testTransaction.destinationAccountId);
      expect(res.body.data.type).toEqual(testTransaction.type);
      expect(res.body.data.amount).toEqual(testTransaction.amount);
      expect(res.body.data.status).toEqual('PENDING');
    });

    it('should not create transaction with missing required fields', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ sourceAccountId: 'account123' });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
    });

    it('should validate transaction type and destination account', async () => {
      // Test TRANSFER without destination account
      const res = await request(app)
        .post('/api/transactions')
        .send({
          sourceAccountId: 'account123',
          type: 'TRANSFER',
          amount: 100,
          currency: 'USD'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
      expect(res.body.message).toContain('Destination account ID is required');
    });
  });

  describe('GET /api/transactions', () => {
    it('should get all transactions with pagination', async () => {
      // Create test transactions
      await Transaction.create(testTransaction);
      await Transaction.create({
        ...testTransaction,
        type: 'WITHDRAWAL',
        destinationAccountId: null
      });
      
      const res = await request(app)
        .get('/api/transactions')
        .query({ page: 1, limit: 10 });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.results).toEqual(2);
      expect(res.body.page).toEqual(1);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('should filter transactions by account ID', async () => {
      // Create test transactions
      await Transaction.create(testTransaction);
      await Transaction.create({
        sourceAccountId: 'account789',
        type: 'WITHDRAWAL',
        amount: 50,
        currency: 'USD'
      });
      
      const res = await request(app)
        .get('/api/transactions')
        .query({ accountId: 'account123' });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.results).toEqual(1);
      expect(res.body.data[0].sourceAccountId).toEqual('account123');
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should get transaction by ID', async () => {
      // Create test transaction
      const transaction = await Transaction.create(testTransaction);
      
      const res = await request(app)
        .get(`/api/transactions/${transaction._id}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data._id.toString()).toEqual(transaction._id.toString());
    });

    it('should return 404 for non-existent transaction', async () => {
      const res = await request(app)
        .get('/api/transactions/60f7a7b5c9b4e52b3c7a1234');
      
      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toEqual('error');
    });
  });

  describe('PATCH /api/transactions/:id/cancel', () => {
    it('should cancel a pending transaction', async () => {
      // Create test transaction
      const transaction = await Transaction.create(testTransaction);
      
      const res = await request(app)
        .patch(`/api/transactions/${transaction._id}/cancel`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.status).toEqual('CANCELLED');
      expect(res.body.data.cancelledAt).toBeDefined();
    });

    it('should not cancel a completed transaction', async () => {
      // Create completed transaction
      const transaction = await Transaction.create({
        ...testTransaction,
        status: 'COMPLETED',
        completedAt: new Date()
      });
      
      const res = await request(app)
        .patch(`/api/transactions/${transaction._id}/cancel`);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
      expect(res.body.message).toContain('Cannot cancel transaction');
    });
  });
}); 