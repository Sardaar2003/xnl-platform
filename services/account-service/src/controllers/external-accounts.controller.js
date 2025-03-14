const { v4: uuidv4 } = require('uuid');
const plaid = require('plaid');
const axios = require('axios');
const Account = require('../models/account.model');
const ExternalAccount = require('../models/external-account.model');
const { publishEvent } = require('../utils/rabbitmq');

// Initialize Plaid client
const plaidClient = new plaid.Client({
  clientID: process.env.PLAID_CLIENT_ID,
  secret: process.env.PLAID_SECRET,
  env: plaid.environments[process.env.PLAID_ENV || 'sandbox'],
  options: {
    version: '2020-09-14'
  }
});

// Create Plaid link token
exports.createLinkToken = async (req, res) => {
  try {
    const { userId } = req.user;
    
    const configs = {
      user: {
        client_user_id: userId
      },
      client_name: 'XNL Fintech',
      products: ['auth', 'transactions'],
      country_codes: ['US', 'CA', 'GB', 'FR', 'ES', 'NL', 'DE'],
      language: 'en'
    };
    
    const createTokenResponse = await plaidClient.createLinkToken(configs);
    
    res.status(200).json({
      success: true,
      data: {
        linkToken: createTokenResponse.link_token
      }
    });
  } catch (error) {
    console.error('Create link token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create link token',
      error: error.message
    });
  }
};

// Exchange public token for access token
exports.exchangePublicToken = async (req, res) => {
  try {
    const { userId } = req.user;
    const { publicToken, institutionId, institutionName } = req.body;
    
    const exchangeResponse = await plaidClient.exchangePublicToken(publicToken);
    const accessToken = exchangeResponse.access_token;
    const itemId = exchangeResponse.item_id;
    
    // Get account information
    const accountsResponse = await plaidClient.getAccounts(accessToken);
    const accounts = accountsResponse.accounts;
    
    // Create external accounts in our system
    const externalAccounts = [];
    
    for (const account of accounts) {
      const externalAccount = new ExternalAccount({
        externalAccountId: uuidv4(),
        userId,
        institutionId,
        institutionName,
        plaidItemId: itemId,
        plaidAccessToken: accessToken,
        plaidAccountId: account.account_id,
        name: account.name,
        mask: account.mask,
        type: account.type,
        subtype: account.subtype,
        balanceAvailable: account.balances.available,
        balanceCurrent: account.balances.current,
        balanceLimit: account.balances.limit,
        isoCurrencyCode: account.balances.iso_currency_code
      });
      
      await externalAccount.save();
      externalAccounts.push(externalAccount);
      
      // Publish event
      await publishEvent('ExternalAccountLinked', {
        userId,
        externalAccountId: externalAccount.externalAccountId,
        institutionName,
        accountType: account.type,
        accountSubtype: account.subtype
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        accounts: externalAccounts.map(account => ({
          externalAccountId: account.externalAccountId,
          name: account.name,
          mask: account.mask,
          type: account.type,
          subtype: account.subtype,
          balanceAvailable: account.balanceAvailable,
          balanceCurrent: account.balanceCurrent,
          institutionName: account.institutionName
        }))
      }
    });
  } catch (error) {
    console.error('Exchange public token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link account',
      error: error.message
    });
  }
};

// Get linked external accounts
exports.getExternalAccounts = async (req, res) => {
  try {
    const { userId } = req.user;
    
    const externalAccounts = await ExternalAccount.find({ userId });
    
    res.status(200).json({
      success: true,
      data: {
        accounts: externalAccounts.map(account => ({
          externalAccountId: account.externalAccountId,
          name: account.name,
          mask: account.mask,
          type: account.type,
          subtype: account.subtype,
          balanceAvailable: account.balanceAvailable,
          balanceCurrent: account.balanceCurrent,
          institutionName: account.institutionName,
          createdAt: account.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get external accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get external accounts',
      error: error.message
    });
  }
};

// Get transactions from external account
exports.getExternalTransactions = async (req, res) => {
  try {
    const { userId } = req.user;
    const { externalAccountId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Find external account
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
    
    // Get transactions from Plaid
    const transactionsResponse = await plaidClient.getTransactions(
      externalAccount.plaidAccessToken,
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 30 days ago
      endDate || new Date().toISOString().split('T')[0], // Default to today
      {
        account_ids: [externalAccount.plaidAccountId]
      }
    );
    
    const transactions = transactionsResponse.transactions;
    
    res.status(200).json({
      success: true,
      data: {
        transactions: transactions.map(transaction => ({
          transactionId: transaction.transaction_id,
          accountId: transaction.account_id,
          amount: transaction.amount,
          date: transaction.date,
          name: transaction.name,
          merchantName: transaction.merchant_name,
          category: transaction.category,
          pending: transaction.pending,
          paymentChannel: transaction.payment_channel,
          isoCurrencyCode: transaction.iso_currency_code
        }))
      }
    });
  } catch (error) {
    console.error('Get external transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get external transactions',
      error: error.message
    });
  }
};

// Unlink external account
exports.unlinkExternalAccount = async (req, res) => {
  try {
    const { userId } = req.user;
    const { externalAccountId } = req.params;
    
    // Find external account
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
    
    // Remove access token from Plaid
    await plaidClient.removeItem(externalAccount.plaidAccessToken);
    
    // Delete external account
    await ExternalAccount.deleteOne({ externalAccountId });
    
    // Publish event
    await publishEvent('ExternalAccountUnlinked', {
      userId,
      externalAccountId,
      institutionName: externalAccount.institutionName
    });
    
    res.status(200).json({
      success: true,
      message: 'External account unlinked successfully'
    });
  } catch (error) {
    console.error('Unlink external account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink external account',
      error: error.message
    });
  }
};

// Yodlee Integration
exports.createYodleeFastLink = async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Get Yodlee access token
    const tokenResponse = await axios.post(
      `${process.env.YODLEE_API_URL}/auth/token`,
      {
        clientId: process.env.YODLEE_CLIENT_ID,
        secret: process.env.YODLEE_CLIENT_SECRET
      }
    );
    
    const accessToken = tokenResponse.data.token;
    
    // Create FastLink token
    const fastLinkResponse = await axios.post(
      `${process.env.YODLEE_API_URL}/fastlink/token`,
      {
        user: {
          id: userId
        },
        configName: 'XNLFintech'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        fastLinkToken: fastLinkResponse.data.token,
        fastLinkUrl: `${process.env.YODLEE_FASTLINK_URL}?token=${fastLinkResponse.data.token}`
      }
    });
  } catch (error) {
    console.error('Create Yodlee FastLink error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Yodlee FastLink',
      error: error.message
    });
  }
};

module.exports = {
  createLinkToken,
  exchangePublicToken,
  getExternalAccounts,
  getExternalTransactions,
  unlinkExternalAccount,
  createYodleeFastLink
}; 