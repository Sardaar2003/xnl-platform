const express = require('express');
const { body, param, query } = require('express-validator');
const transactionController = require('../controllers/transaction.controller');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @route POST /api/transactions
 * @desc Create a new transaction
 * @access Private
 */
router.post(
  '/',
  [
    body('sourceAccountId').notEmpty().withMessage('Source account ID is required'),
    body('type')
      .notEmpty()
      .withMessage('Transaction type is required')
      .isIn(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT', 'REFUND', 'FEE'])
      .withMessage('Invalid transaction type'),
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('currency')
      .notEmpty()
      .withMessage('Currency is required')
      .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY', 'INR'])
      .withMessage('Invalid currency'),
    validate
  ],
  transactionController.createTransaction
);

/**
 * @route GET /api/transactions
 * @desc Get all transactions with filtering
 * @access Private
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type')
      .optional()
      .isIn(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT', 'REFUND', 'FEE'])
      .withMessage('Invalid transaction type'),
    query('status')
      .optional()
      .isIn(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'])
      .withMessage('Invalid status'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    validate
  ],
  transactionController.getTransactions
);

/**
 * @route GET /api/transactions/:id
 * @desc Get transaction by ID
 * @access Private
 */
router.get(
  '/:id',
  [
    param('id').notEmpty().withMessage('Transaction ID is required'),
    validate
  ],
  transactionController.getTransactionById
);

/**
 * @route GET /api/transactions/txn/:transactionId
 * @desc Get transaction by transaction ID
 * @access Private
 */
router.get(
  '/txn/:transactionId',
  [
    param('transactionId').notEmpty().withMessage('Transaction ID is required'),
    validate
  ],
  transactionController.getTransactionByTransactionId
);

/**
 * @route PATCH /api/transactions/:id/cancel
 * @desc Cancel a transaction
 * @access Private
 */
router.patch(
  '/:id/cancel',
  [
    param('id').notEmpty().withMessage('Transaction ID is required'),
    validate
  ],
  transactionController.cancelTransaction
);

module.exports = router; 