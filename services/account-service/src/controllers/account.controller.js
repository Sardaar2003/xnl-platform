const { ApiError } = require('../middleware/errorHandler');
const Account = require('../models/account.model');
const logger = require('../utils/logger');
const rabbitmq = require('../utils/rabbitmq');

/**
 * Create a new account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createAccount = async (req, res, next) => {
  try {
    const { userId, accountType, name, currency, description } = req.body;
    
    // Check if user already has an account of this type
    const existingAccount = await Account.findOne({ 
      userId, 
      accountType,
      status: { $ne: 'CLOSED' }
    });
    
    if (existingAccount) {
      throw new ApiError(400, `User already has an active ${accountType} account`);
    }
    
    const account = new Account({
      userId,
      accountType,
      name,
      currency,
      description,
      balance: 0,
      status: 'ACTIVE'
    });
    
    const savedAccount = await account.save();
    
    logger.info(`Account created: ${savedAccount._id} for user ${userId}`);
    
    // Publish account created event
    await rabbitmq.publishMessage('account.created', {
      event: 'account.created',
      data: savedAccount
    });
    
    res.status(201).json({
      status: 'success',
      data: savedAccount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all accounts for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getUserAccounts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const accounts = await Account.find({ 
      userId,
      status: { $ne: 'CLOSED' }
    });
    
    res.status(200).json({
      status: 'success',
      results: accounts.length,
      data: accounts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get account by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getAccountById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const account = await Account.findById(id);
    
    if (!account) {
      throw new ApiError(404, 'Account not found');
    }
    
    res.status(200).json({
      status: 'success',
      data: account
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update account details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const account = await Account.findById(id);
    
    if (!account) {
      throw new ApiError(404, 'Account not found');
    }
    
    if (account.status === 'CLOSED') {
      throw new ApiError(400, 'Cannot update a closed account');
    }
    
    account.name = name || account.name;
    account.description = description || account.description;
    account.updatedAt = Date.now();
    
    const updatedAccount = await account.save();
    
    logger.info(`Account updated: ${updatedAccount._id}`);
    
    // Publish account updated event
    await rabbitmq.publishMessage('account.updated', {
      event: 'account.updated',
      data: updatedAccount
    });
    
    res.status(200).json({
      status: 'success',
      data: updatedAccount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Close an account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const closeAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const account = await Account.findById(id);
    
    if (!account) {
      throw new ApiError(404, 'Account not found');
    }
    
    if (account.status === 'CLOSED') {
      throw new ApiError(400, 'Account is already closed');
    }
    
    if (account.balance > 0) {
      throw new ApiError(400, 'Cannot close account with positive balance');
    }
    
    account.status = 'CLOSED';
    account.closedAt = Date.now();
    account.updatedAt = Date.now();
    
    const closedAccount = await account.save();
    
    logger.info(`Account closed: ${closedAccount._id}`);
    
    // Publish account closed event
    await rabbitmq.publishMessage('account.closed', {
      event: 'account.closed',
      data: closedAccount
    });
    
    res.status(200).json({
      status: 'success',
      data: closedAccount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update account balance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { operation, amount, description } = req.body;
    
    if (!['CREDIT', 'DEBIT'].includes(operation)) {
      throw new ApiError(400, 'Operation must be either CREDIT or DEBIT');
    }
    
    if (!amount || amount <= 0) {
      throw new ApiError(400, 'Amount must be greater than 0');
    }
    
    const account = await Account.findById(id);
    
    if (!account) {
      throw new ApiError(404, 'Account not found');
    }
    
    if (account.status === 'CLOSED') {
      throw new ApiError(400, 'Cannot update balance of a closed account');
    }
    
    if (operation === 'DEBIT' && account.balance < amount) {
      throw new ApiError(400, 'Insufficient balance');
    }
    
    // Update balance
    if (operation === 'CREDIT') {
      account.balance += amount;
    } else {
      account.balance -= amount;
    }
    
    account.updatedAt = Date.now();
    
    // Add transaction to history
    account.transactions.push({
      operation,
      amount,
      description,
      balanceAfter: account.balance,
      timestamp: Date.now()
    });
    
    const updatedAccount = await account.save();
    
    logger.info(`Account balance updated: ${updatedAccount._id}, ${operation} ${amount}`);
    
    // Publish account balance updated event
    await rabbitmq.publishMessage('account.balance.updated', {
      event: 'account.balance.updated',
      data: {
        accountId: updatedAccount._id,
        userId: updatedAccount.userId,
        operation,
        amount,
        balance: updatedAccount.balance,
        currency: updatedAccount.currency,
        description
      }
    });
    
    // Check if balance is low and publish event if needed
    const lowBalanceThreshold = 100; // This could be configurable
    if (updatedAccount.balance < lowBalanceThreshold) {
      await rabbitmq.publishMessage('account.low_balance', {
        event: 'account.low_balance',
        data: {
          accountId: updatedAccount._id,
          userId: updatedAccount.userId,
          balance: updatedAccount.balance,
          currency: updatedAccount.currency,
          threshold: lowBalanceThreshold
        }
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: updatedAccount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAccount,
  getUserAccounts,
  getAccountById,
  updateAccount,
  closeAccount,
  updateBalance
}; 