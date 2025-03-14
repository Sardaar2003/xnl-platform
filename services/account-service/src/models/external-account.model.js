const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const externalAccountSchema = new mongoose.Schema(
  {
    externalAccountId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    // External provider account ID
    providerAccountId: {
      type: String,
      required: true
    },
    // External provider item ID (e.g., Plaid Item ID)
    providerItemId: {
      type: String,
      required: true
    },
    // External provider name (e.g., 'plaid', 'yodlee', etc.)
    provider: {
      type: String,
      required: true,
      enum: ['plaid', 'yodlee', 'mx', 'teller', 'other']
    },
    // Institution information
    institutionId: {
      type: String,
      required: true
    },
    institutionName: {
      type: String,
      required: true
    },
    // Account details
    name: {
      type: String,
      required: true
    },
    mask: {
      type: String
    },
    type: {
      type: String,
      required: true,
      enum: ['depository', 'credit', 'loan', 'investment', 'other']
    },
    subtype: {
      type: String
    },
    // Balance information
    balanceCurrent: {
      type: Number,
      required: true
    },
    balanceAvailable: {
      type: Number
    },
    balanceLimit: {
      type: Number
    },
    isoCurrencyCode: {
      type: String,
      required: true,
      default: 'USD'
    },
    // Status and sync information
    status: {
      type: String,
      enum: ['active', 'pending', 'error', 'disconnected'],
      default: 'active'
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now
    },
    errorCode: {
      type: String
    },
    errorMessage: {
      type: String
    },
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
externalAccountSchema.index({ userId: 1, provider: 1 });
externalAccountSchema.index({ providerItemId: 1 });
externalAccountSchema.index({ providerAccountId: 1 }, { unique: true });

/**
 * @typedef ExternalAccount
 */
const ExternalAccount = mongoose.model('ExternalAccount', externalAccountSchema);

module.exports = ExternalAccount; 