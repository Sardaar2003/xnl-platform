const ExternalAccount = require('../models/external-account.model');
const logger = require('../utils/logger');
const rabbitmq = require('../utils/rabbitmq');

/**
 * Link an external account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.linkExternalAccount = async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      providerAccountId,
      providerItemId,
      provider,
      institutionId,
      institutionName,
      name,
      mask,
      type,
      subtype,
      balanceCurrent,
      balanceAvailable,
      balanceLimit,
      isoCurrencyCode
    } = req.body;

    // Check if account already exists
    const existingAccount = await ExternalAccount.findOne({
      userId,
      providerAccountId
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'External account already linked',
        data: existingAccount
      });
    }

    // Create new external account
    const externalAccount = new ExternalAccount({
      userId,
      providerAccountId,
      providerItemId,
      provider,
      institutionId,
      institutionName,
      name,
      mask,
      type,
      subtype,
      balanceCurrent,
      balanceAvailable,
      balanceLimit,
      isoCurrencyCode,
      status: 'active',
      lastSyncedAt: new Date()
    });

    await externalAccount.save();

    // Publish event to RabbitMQ
    await rabbitmq.publishMessage(
      rabbitmq.TRANSACTION_SERVICE_QUEUE,
      {
        event: 'EXTERNAL_ACCOUNT_LINKED',
        data: {
          userId,
          externalAccountId: externalAccount.externalAccountId,
          providerAccountId,
          provider,
          type
        }
      }
    );

    res.status(201).json({
      success: true,
      message: 'External account linked successfully',
      data: externalAccount
    });
  } catch (error) {
    logger.error('Error linking external account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link external account',
      error: error.message
    });
  }
};

/**
 * Get all external accounts for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getExternalAccounts = async (req, res) => {
  try {
    const { userId } = req.user;
    const { provider, status } = req.query;

    // Build query
    const query = { userId };

    if (provider) {
      query.provider = provider;
    }

    if (status) {
      query.status = status;
    }

    const externalAccounts = await ExternalAccount.find(query);

    res.status(200).json({
      success: true,
      count: externalAccounts.length,
      data: externalAccounts
    });
  } catch (error) {
    logger.error('Error getting external accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get external accounts',
      error: error.message
    });
  }
};

/**
 * Get a single external account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getExternalAccount = async (req, res) => {
  try {
    const { userId } = req.user;
    const { externalAccountId } = req.params;

    const externalAccount = await ExternalAccount.findOne({
      externalAccountId,
      userId
    });

    if (!externalAccount) {
      return res.status(404).json({
        success: false,
        message: 'External account not found'
      });
    }

    res.status(200).json({
      success: true,
      data: externalAccount
    });
  } catch (error) {
    logger.error('Error getting external account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get external account',
      error: error.message
    });
  }
};

/**
 * Update external account balance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateExternalAccountBalance = async (req, res) => {
  try {
    const { userId } = req.user;
    const { externalAccountId } = req.params;
    const { balanceCurrent, balanceAvailable, balanceLimit } = req.body;

    const externalAccount = await ExternalAccount.findOne({
      externalAccountId,
      userId
    });

    if (!externalAccount) {
      return res.status(404).json({
        success: false,
        message: 'External account not found'
      });
    }

    // Update balance fields
    if (balanceCurrent !== undefined) {
      externalAccount.balanceCurrent = balanceCurrent;
    }

    if (balanceAvailable !== undefined) {
      externalAccount.balanceAvailable = balanceAvailable;
    }

    if (balanceLimit !== undefined) {
      externalAccount.balanceLimit = balanceLimit;
    }

    externalAccount.lastSyncedAt = new Date();
    await externalAccount.save();

    // Publish event to RabbitMQ
    await rabbitmq.publishMessage(
      rabbitmq.TRANSACTION_SERVICE_QUEUE,
      {
        event: 'EXTERNAL_ACCOUNT_BALANCE_UPDATED',
        data: {
          userId,
          externalAccountId,
          balanceCurrent: externalAccount.balanceCurrent,
          balanceAvailable: externalAccount.balanceAvailable,
          balanceLimit: externalAccount.balanceLimit
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'External account balance updated successfully',
      data: externalAccount
    });
  } catch (error) {
    logger.error('Error updating external account balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update external account balance',
      error: error.message
    });
  }
};

/**
 * Update external account status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateExternalAccountStatus = async (req, res) => {
  try {
    const { userId } = req.user;
    const { externalAccountId } = req.params;
    const { status, errorCode, errorMessage } = req.body;

    const externalAccount = await ExternalAccount.findOne({
      externalAccountId,
      userId
    });

    if (!externalAccount) {
      return res.status(404).json({
        success: false,
        message: 'External account not found'
      });
    }

    // Update status fields
    externalAccount.status = status;
    
    if (errorCode !== undefined) {
      externalAccount.errorCode = errorCode;
    }
    
    if (errorMessage !== undefined) {
      externalAccount.errorMessage = errorMessage;
    }

    await externalAccount.save();

    res.status(200).json({
      success: true,
      message: 'External account status updated successfully',
      data: externalAccount
    });
  } catch (error) {
    logger.error('Error updating external account status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update external account status',
      error: error.message
    });
  }
};

/**
 * Unlink an external account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.unlinkExternalAccount = async (req, res) => {
  try {
    const { userId } = req.user;
    const { externalAccountId } = req.params;

    const externalAccount = await ExternalAccount.findOne({
      externalAccountId,
      userId
    });

    if (!externalAccount) {
      return res.status(404).json({
        success: false,
        message: 'External account not found'
      });
    }

    await ExternalAccount.deleteOne({ externalAccountId, userId });

    // Publish event to RabbitMQ
    await rabbitmq.publishMessage(
      rabbitmq.TRANSACTION_SERVICE_QUEUE,
      {
        event: 'EXTERNAL_ACCOUNT_UNLINKED',
        data: {
          userId,
          externalAccountId,
          providerAccountId: externalAccount.providerAccountId,
          provider: externalAccount.provider
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'External account unlinked successfully'
    });
  } catch (error) {
    logger.error('Error unlinking external account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink external account',
      error: error.message
    });
  }
};

module.exports = {
  linkExternalAccount,
  getExternalAccounts,
  getExternalAccount,
  updateExternalAccountBalance,
  updateExternalAccountStatus,
  unlinkExternalAccount
}; 