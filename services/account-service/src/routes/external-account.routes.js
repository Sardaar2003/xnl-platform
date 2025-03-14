const express = require('express');
const router = express.Router();
const externalAccountController = require('../controllers/external-account.controller');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validator');

/**
 * @route POST /api/external-accounts
 * @desc Link an external account
 * @access Private
 */
router.post(
  '/',
  authenticate,
  validateRequest({
    body: {
      providerAccountId: { type: 'string', required: true },
      providerItemId: { type: 'string', required: true },
      provider: { type: 'string', required: true, enum: ['plaid', 'yodlee', 'mx', 'teller', 'other'] },
      institutionId: { type: 'string', required: true },
      institutionName: { type: 'string', required: true },
      name: { type: 'string', required: true },
      mask: { type: 'string' },
      type: { type: 'string', required: true, enum: ['depository', 'credit', 'loan', 'investment', 'other'] },
      subtype: { type: 'string' },
      balanceCurrent: { type: 'number', required: true },
      balanceAvailable: { type: 'number' },
      balanceLimit: { type: 'number' },
      isoCurrencyCode: { type: 'string', default: 'USD' }
    }
  }),
  externalAccountController.linkExternalAccount
);

/**
 * @route GET /api/external-accounts
 * @desc Get all external accounts for a user
 * @access Private
 */
router.get(
  '/',
  authenticate,
  externalAccountController.getExternalAccounts
);

/**
 * @route GET /api/external-accounts/:externalAccountId
 * @desc Get a single external account
 * @access Private
 */
router.get(
  '/:externalAccountId',
  authenticate,
  externalAccountController.getExternalAccount
);

/**
 * @route PATCH /api/external-accounts/:externalAccountId/balance
 * @desc Update external account balance
 * @access Private
 */
router.patch(
  '/:externalAccountId/balance',
  authenticate,
  validateRequest({
    body: {
      balanceCurrent: { type: 'number' },
      balanceAvailable: { type: 'number' },
      balanceLimit: { type: 'number' }
    }
  }),
  externalAccountController.updateExternalAccountBalance
);

/**
 * @route PATCH /api/external-accounts/:externalAccountId/status
 * @desc Update external account status
 * @access Private
 */
router.patch(
  '/:externalAccountId/status',
  authenticate,
  validateRequest({
    body: {
      status: { type: 'string', required: true, enum: ['active', 'pending', 'error', 'disconnected'] },
      errorCode: { type: 'string' },
      errorMessage: { type: 'string' }
    }
  }),
  externalAccountController.updateExternalAccountStatus
);

/**
 * @route DELETE /api/external-accounts/:externalAccountId
 * @desc Unlink an external account
 * @access Private
 */
router.delete(
  '/:externalAccountId',
  authenticate,
  externalAccountController.unlinkExternalAccount
);

module.exports = router; 