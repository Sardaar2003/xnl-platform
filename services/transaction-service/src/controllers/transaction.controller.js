const { ApiError } = require('../middleware/errorHandler');
const Transaction = require('../models/transaction.model');
const logger = require('../utils/logger');
const axios = require('axios');
const rabbitmq = require('../utils/rabbitmq');

// Account service URL
const ACCOUNT_SERVICE_URL = process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3002';

/**
 * Create a new transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createTransaction = async (req, res, next) => {
  try {
    const { 
      sourceAccountId, 
      destinationAccountId, 
      type, 
      amount, 
      currency, 
      description 
    } = req.body;
    
    // Validate transaction type
    if (type === 'TRANSFER' && !destinationAccountId) {
      throw new ApiError(400, 'Destination account ID is required for transfers');
    }
    
    if (['DEPOSIT', 'PAYMENT', 'REFUND'].includes(type) && !destinationAccountId) {
      throw new ApiError(400, `Destination account ID is required for ${type.toLowerCase()}`);
    }
    
    if (['WITHDRAWAL', 'FEE'].includes(type) && destinationAccountId) {
      throw new ApiError(400, `Destination account ID should not be provided for ${type.toLowerCase()}`);
    }
    
    // Create transaction
    const transaction = new Transaction({
      sourceAccountId,
      destinationAccountId,
      type,
      amount,
      currency,
      description,
      status: 'PENDING'
    });
    
    // Save transaction
    const savedTransaction = await transaction.save();
    
    logger.info(`Transaction created: ${savedTransaction.transactionId}`);
    
    // Process transaction asynchronously
    // In a real-world scenario, this would be handled by a message queue
    processTransaction(savedTransaction._id).catch(error => {
      logger.error(`Error processing transaction ${savedTransaction.transactionId}: ${error.message}`);
    });
    
    res.status(201).json({
      status: 'success',
      data: savedTransaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all transactions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTransactions = async (req, res, next) => {
  try {
    const { 
      accountId, 
      type, 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Build query
    const query = {};
    
    if (accountId) {
      query.$or = [
        { sourceAccountId: accountId },
        { destinationAccountId: accountId }
      ];
    }
    
    if (type) {
      query.type = type.toUpperCase();
    }
    
    if (status) {
      query.status = status.toUpperCase();
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Transaction.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      results: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }
    
    res.status(200).json({
      status: 'success',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction by transaction ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTransactionByTransactionId = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = await Transaction.findOne({ transactionId });
    
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }
    
    res.status(200).json({
      status: 'success',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const cancelTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }
    
    if (transaction.status !== 'PENDING') {
      throw new ApiError(400, `Cannot cancel transaction with status ${transaction.status}`);
    }
    
    transaction.status = 'CANCELLED';
    transaction.cancelledAt = Date.now();
    
    const updatedTransaction = await transaction.save();
    
    logger.info(`Transaction cancelled: ${updatedTransaction.transactionId}`);
    
    // Publish transaction cancelled event
    await rabbitmq.publishMessage('transaction.cancelled', {
      event: 'transaction.cancelled',
      data: updatedTransaction
    });
    
    res.status(200).json({
      status: 'success',
      data: updatedTransaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process a transaction (internal function)
 * @param {string} transactionId - Transaction ID
 */
const processTransaction = async (transactionId) => {
  try {
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction || transaction.status !== 'PENDING') {
      return;
    }
    
    logger.info(`Processing transaction: ${transaction.transactionId}`);
    
    // Validate accounts and check balances
    try {
      // Check source account
      const sourceAccountResponse = await axios.get(`${ACCOUNT_SERVICE_URL}/api/accounts/${transaction.sourceAccountId}`);
      const sourceAccount = sourceAccountResponse.data.data;
      
      // For transfers, deposits, payments, and refunds, check destination account
      if (['TRANSFER', 'DEPOSIT', 'PAYMENT', 'REFUND'].includes(transaction.type)) {
        if (!transaction.destinationAccountId) {
          throw new Error(`Destination account ID is required for ${transaction.type}`);
        }
        
        const destinationAccountResponse = await axios.get(`${ACCOUNT_SERVICE_URL}/api/accounts/${transaction.destinationAccountId}`);
        const destinationAccount = destinationAccountResponse.data.data;
        
        // Check if accounts have the same currency or handle currency conversion
        if (sourceAccount.currency !== transaction.currency || destinationAccount.currency !== transaction.currency) {
          // In a real-world scenario, we would handle currency conversion here
          // For simplicity, we'll just throw an error
          throw new Error('Currency mismatch. Currency conversion not supported yet.');
        }
      }
      
      // For withdrawals and fees, check if source account has sufficient balance
      if (['WITHDRAWAL', 'FEE', 'TRANSFER'].includes(transaction.type)) {
        if (sourceAccount.balance < transaction.amount) {
          throw new Error('Insufficient balance');
        }
      }
      
      // Update account balances via Account Service
      await updateAccountBalances(transaction);
      
      // Mark transaction as completed
      transaction.status = 'COMPLETED';
      transaction.completedAt = Date.now();
      await transaction.save();
      
      // Publish transaction completed event
      await rabbitmq.publishMessage('transaction.completed', {
        event: 'transaction.completed',
        data: transaction
      });
      
      logger.info(`Transaction completed: ${transaction.transactionId}`);
    } catch (error) {
      // Mark transaction as failed
      transaction.status = 'FAILED';
      transaction.failedAt = Date.now();
      transaction.metadata.set('failureReason', error.message);
      await transaction.save();
      
      // Publish transaction failed event
      await rabbitmq.publishMessage('transaction.failed', {
        event: 'transaction.failed',
        data: {
          ...transaction.toObject(),
          failureReason: error.message
        }
      });
      
      logger.error(`Transaction failed: ${transaction.transactionId} - ${error.message}`);
    }
  } catch (error) {
    logger.error(`Error processing transaction: ${error.message}`);
    throw error;
  }
};

/**
 * Update account balances (internal function)
 * @param {Object} transaction - Transaction object
 */
const updateAccountBalances = async (transaction) => {
  try {
    const { sourceAccountId, destinationAccountId, type, amount } = transaction;
    
    // Update source account balance
    if (['WITHDRAWAL', 'FEE', 'TRANSFER'].includes(type)) {
      await axios.patch(`${ACCOUNT_SERVICE_URL}/api/accounts/${sourceAccountId}/balance`, {
        operation: 'DEBIT',
        amount,
        description: `${type} - ${transaction.transactionId}`
      });
    }
    
    // Update destination account balance
    if (['DEPOSIT', 'PAYMENT', 'REFUND', 'TRANSFER'].includes(type) && destinationAccountId) {
      await axios.patch(`${ACCOUNT_SERVICE_URL}/api/accounts/${destinationAccountId}/balance`, {
        operation: 'CREDIT',
        amount,
        description: `${type} - ${transaction.transactionId}`
      });
    }
  } catch (error) {
    logger.error(`Error updating account balances: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionByTransactionId,
  cancelTransaction,
  processTransaction
}; 