const express = require('express');
const router = express.Router();
const recurringTransactionController = require('../controllers/recurring-transaction.controller');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validator');

/**
 * @route POST /api/recurring-transactions
 * @desc Create a new recurring transaction
 * @access Private
 */
router.post(
  '/',
  authenticate,
  validateRequest({
    body: {
      accountId: { type: 'string', required: true },
      type: { type: 'string', required: true, enum: ['deposit', 'withdrawal', 'transfer', 'investment'] },
      amount: { type: 'number', required: true, min: 0.01 },
      currency: { type: 'string', default: 'USD' },
      description: { type: 'string', required: true },
      frequency: { type: 'string', required: true, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'] },
      dayOfWeek: { type: 'number', min: 0, max: 6 },
      dayOfMonth: { type: 'number', min: 1, max: 31 },
      month: { type: 'number', min: 0, max: 11 },
      startDate: { type: 'string', required: true },
      endDate: { type: 'string' },
      maxExecutions: { type: 'number', min: 1 },
      metadata: { type: 'object' },
      destinationAccountId: { type: 'string' }
    }
  }),
  recurringTransactionController.createRecurringTransaction
);

/**
 * @route GET /api/recurring-transactions
 * @desc Get all recurring transactions for a user
 * @access Private
 */
router.get(
  '/',
  authenticate,
  recurringTransactionController.getRecurringTransactions
);

/**
 * @route GET /api/recurring-transactions/:recurringTransactionId
 * @desc Get a single recurring transaction
 * @access Private
 */
router.get(
  '/:recurringTransactionId',
  authenticate,
  recurringTransactionController.getRecurringTransaction
);

/**
 * @route PATCH /api/recurring-transactions/:recurringTransactionId
 * @desc Update a recurring transaction
 * @access Private
 */
router.patch(
  '/:recurringTransactionId',
  authenticate,
  validateRequest({
    body: {
      amount: { type: 'number', min: 0.01 },
      currency: { type: 'string' },
      description: { type: 'string' },
      frequency: { type: 'string', enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'] },
      dayOfWeek: { type: 'number', min: 0, max: 6 },
      dayOfMonth: { type: 'number', min: 1, max: 31 },
      month: { type: 'number', min: 0, max: 11 },
      endDate: { type: 'string' },
      maxExecutions: { type: 'number', min: 1 },
      status: { type: 'string', enum: ['active', 'paused'] },
      metadata: { type: 'object' },
      destinationAccountId: { type: 'string' }
    }
  }),
  recurringTransactionController.updateRecurringTransaction
);

/**
 * @route DELETE /api/recurring-transactions/:recurringTransactionId
 * @desc Cancel a recurring transaction
 * @access Private
 */
router.delete(
  '/:recurringTransactionId',
  authenticate,
  recurringTransactionController.cancelRecurringTransaction
);

/**
 * @route POST /api/recurring-transactions/:recurringTransactionId/execute
 * @desc Execute a recurring transaction manually
 * @access Private
 */
router.post(
  '/:recurringTransactionId/execute',
  authenticate,
  recurringTransactionController.executeRecurringTransaction
);

module.exports = router; 