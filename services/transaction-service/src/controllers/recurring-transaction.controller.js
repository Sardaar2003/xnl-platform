const { v4: uuidv4 } = require('uuid');
const RecurringTransaction = require('../models/recurring-transaction.model');
const Transaction = require('../models/transaction.model');
const logger = require('../utils/logger');
const rabbitmq = require('../utils/rabbitmq');

/**
 * Create a recurring transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createRecurringTransaction = async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      accountId,
      type,
      amount,
      currency,
      description,
      frequency,
      dayOfWeek,
      dayOfMonth,
      month,
      startDate,
      endDate,
      maxExecutions,
      metadata,
      destinationAccountId
    } = req.body;

    // Create recurring transaction
    const recurringTransaction = new RecurringTransaction({
      recurringTransactionId: uuidv4(),
      userId,
      accountId,
      type,
      amount,
      currency: currency || 'USD',
      description,
      frequency,
      dayOfWeek,
      dayOfMonth,
      month,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      nextExecutionDate: new Date(startDate),
      status: 'active',
      metadata,
      destinationAccountId,
      maxExecutions
    });

    // Calculate next execution date
    recurringTransaction.nextExecutionDate = recurringTransaction.calculateNextExecutionDate();

    await recurringTransaction.save();

    // Publish event to RabbitMQ
    await rabbitmq.publishMessage(
      rabbitmq.NOTIFICATION_SERVICE_QUEUE,
      {
        event: 'RECURRING_TRANSACTION_CREATED',
        data: {
          userId,
          recurringTransactionId: recurringTransaction.recurringTransactionId,
          type,
          amount,
          currency: recurringTransaction.currency,
          frequency,
          nextExecutionDate: recurringTransaction.nextExecutionDate
        }
      }
    );

    res.status(201).json({
      success: true,
      message: 'Recurring transaction created successfully',
      data: recurringTransaction
    });
  } catch (error) {
    logger.error('Error creating recurring transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create recurring transaction',
      error: error.message
    });
  }
};

/**
 * Get all recurring transactions for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRecurringTransactions = async (req, res) => {
  try {
    const { userId } = req.user;
    const { status, accountId } = req.query;

    // Build query
    const query = { userId };

    if (status) {
      query.status = status;
    }

    if (accountId) {
      query.accountId = accountId;
    }

    const recurringTransactions = await RecurringTransaction.find(query)
      .sort({ nextExecutionDate: 1 });

    res.status(200).json({
      success: true,
      count: recurringTransactions.length,
      data: recurringTransactions
    });
  } catch (error) {
    logger.error('Error getting recurring transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recurring transactions',
      error: error.message
    });
  }
};

/**
 * Get a single recurring transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRecurringTransaction = async (req, res) => {
  try {
    const { userId } = req.user;
    const { recurringTransactionId } = req.params;

    const recurringTransaction = await RecurringTransaction.findOne({
      recurringTransactionId,
      userId
    });

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: recurringTransaction
    });
  } catch (error) {
    logger.error('Error getting recurring transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recurring transaction',
      error: error.message
    });
  }
};

/**
 * Update a recurring transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateRecurringTransaction = async (req, res) => {
  try {
    const { userId } = req.user;
    const { recurringTransactionId } = req.params;
    const updateData = req.body;

    // Find recurring transaction
    const recurringTransaction = await RecurringTransaction.findOne({
      recurringTransactionId,
      userId
    });

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found'
      });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key === 'startDate' || key === 'endDate') {
        recurringTransaction[key] = updateData[key] ? new Date(updateData[key]) : null;
      } else {
        recurringTransaction[key] = updateData[key];
      }
    });

    // Recalculate next execution date if frequency-related fields were updated
    if (
      updateData.frequency ||
      updateData.dayOfWeek ||
      updateData.dayOfMonth ||
      updateData.month ||
      updateData.startDate
    ) {
      recurringTransaction.nextExecutionDate = recurringTransaction.calculateNextExecutionDate();
    }

    await recurringTransaction.save();

    // Publish event to RabbitMQ
    await rabbitmq.publishMessage(
      rabbitmq.NOTIFICATION_SERVICE_QUEUE,
      {
        event: 'RECURRING_TRANSACTION_UPDATED',
        data: {
          userId,
          recurringTransactionId,
          type: recurringTransaction.type,
          amount: recurringTransaction.amount,
          currency: recurringTransaction.currency,
          frequency: recurringTransaction.frequency,
          nextExecutionDate: recurringTransaction.nextExecutionDate,
          status: recurringTransaction.status
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Recurring transaction updated successfully',
      data: recurringTransaction
    });
  } catch (error) {
    logger.error('Error updating recurring transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update recurring transaction',
      error: error.message
    });
  }
};

/**
 * Cancel a recurring transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.cancelRecurringTransaction = async (req, res) => {
  try {
    const { userId } = req.user;
    const { recurringTransactionId } = req.params;

    // Find recurring transaction
    const recurringTransaction = await RecurringTransaction.findOne({
      recurringTransactionId,
      userId
    });

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found'
      });
    }

    // Update status to cancelled
    recurringTransaction.status = 'cancelled';
    await recurringTransaction.save();

    // Publish event to RabbitMQ
    await rabbitmq.publishMessage(
      rabbitmq.NOTIFICATION_SERVICE_QUEUE,
      {
        event: 'RECURRING_TRANSACTION_CANCELLED',
        data: {
          userId,
          recurringTransactionId,
          type: recurringTransaction.type,
          amount: recurringTransaction.amount,
          currency: recurringTransaction.currency
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Recurring transaction cancelled successfully',
      data: recurringTransaction
    });
  } catch (error) {
    logger.error('Error cancelling recurring transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel recurring transaction',
      error: error.message
    });
  }
};

/**
 * Execute a recurring transaction manually
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.executeRecurringTransaction = async (req, res) => {
  try {
    const { userId } = req.user;
    const { recurringTransactionId } = req.params;

    // Find recurring transaction
    const recurringTransaction = await RecurringTransaction.findOne({
      recurringTransactionId,
      userId,
      status: 'active'
    });

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Active recurring transaction not found'
      });
    }

    // Create a transaction based on the recurring transaction
    const transaction = new Transaction({
      transactionId: uuidv4(),
      userId,
      accountId: recurringTransaction.accountId,
      type: recurringTransaction.type,
      amount: recurringTransaction.amount,
      currency: recurringTransaction.currency,
      description: `${recurringTransaction.description} (Recurring)`,
      status: 'completed',
      metadata: {
        ...recurringTransaction.metadata,
        recurringTransactionId,
        executedManually: true
      },
      destinationAccountId: recurringTransaction.destinationAccountId
    });

    await transaction.save();

    // Update recurring transaction
    await recurringTransaction.updateAfterExecution();

    // Publish event to RabbitMQ
    await rabbitmq.publishMessage(
      rabbitmq.ACCOUNT_SERVICE_QUEUE,
      {
        event: 'TRANSACTION_CREATED',
        data: {
          userId,
          transactionId: transaction.transactionId,
          accountId: transaction.accountId,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          destinationAccountId: transaction.destinationAccountId
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Recurring transaction executed successfully',
      data: {
        transaction,
        nextExecutionDate: recurringTransaction.nextExecutionDate,
        status: recurringTransaction.status
      }
    });
  } catch (error) {
    logger.error('Error executing recurring transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute recurring transaction',
      error: error.message
    });
  }
};

module.exports = {
  createRecurringTransaction,
  getRecurringTransactions,
  getRecurringTransaction,
  updateRecurringTransaction,
  cancelRecurringTransaction,
  executeRecurringTransaction
}; 