const express = require('express');
const { body, param } = require('express-validator');
const accountController = require('../controllers/account.controller');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @route POST /api/accounts
 * @desc Create a new account
 * @access Private
 */
router.post(
  '/',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('accountType')
      .notEmpty()
      .withMessage('Account type is required')
      .isIn(['SAVINGS', 'CHECKING', 'INVESTMENT', 'CREDIT'])
      .withMessage('Invalid account type'),
    body('name').notEmpty().withMessage('Account name is required'),
    body('currency')
      .notEmpty()
      .withMessage('Currency is required')
      .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY', 'INR'])
      .withMessage('Invalid currency'),
    validate
  ],
  accountController.createAccount
);

/**
 * @route GET /api/accounts/user/:userId
 * @desc Get all accounts for a user
 * @access Private
 */
router.get(
  '/user/:userId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    validate
  ],
  accountController.getUserAccounts
);

/**
 * @route GET /api/accounts/:id
 * @desc Get account by ID
 * @access Private
 */
router.get(
  '/:id',
  [
    param('id').notEmpty().withMessage('Account ID is required'),
    validate
  ],
  accountController.getAccountById
);

/**
 * @route PATCH /api/accounts/:id
 * @desc Update account details
 * @access Private
 */
router.patch(
  '/:id',
  [
    param('id').notEmpty().withMessage('Account ID is required'),
    body('name').optional(),
    body('description').optional(),
    validate
  ],
  accountController.updateAccount
);

/**
 * @route DELETE /api/accounts/:id
 * @desc Close an account
 * @access Private
 */
router.delete(
  '/:id',
  [
    param('id').notEmpty().withMessage('Account ID is required'),
    validate
  ],
  accountController.closeAccount
);

/**
 * @route PATCH /api/accounts/:id/balance
 * @desc Update account balance
 * @access Private
 */
router.patch(
  '/:id/balance',
  [
    param('id').notEmpty().withMessage('Account ID is required'),
    body('operation')
      .notEmpty()
      .withMessage('Operation is required')
      .isIn(['CREDIT', 'DEBIT'])
      .withMessage('Operation must be either CREDIT or DEBIT'),
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('description').optional(),
    validate
  ],
  accountController.updateBalance
);

module.exports = router; 