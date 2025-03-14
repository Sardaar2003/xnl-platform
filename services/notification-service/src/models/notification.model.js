const mongoose = require('mongoose');

/**
 * Notification Schema
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: ['ACCOUNT', 'TRANSACTION', 'SECURITY', 'SYSTEM', 'MARKETING'],
      uppercase: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['UNREAD', 'READ', 'ARCHIVED'],
      default: 'UNREAD',
      uppercase: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      uppercase: true
    },
    metadata: {
      type: Map,
      of: String,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    readAt: {
      type: Date
    },
    archivedAt: {
      type: Date
    },
    expiresAt: {
      type: Date
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });

/**
 * Pre-save middleware
 */
notificationSchema.pre('save', function(next) {
  // Update the updatedAt field on every save
  this.updatedAt = Date.now();
  
  // Set readAt timestamp when status changes to READ
  if (this.isModified('status') && this.status === 'READ' && !this.readAt) {
    this.readAt = Date.now();
  }
  
  // Set archivedAt timestamp when status changes to ARCHIVED
  if (this.isModified('status') && this.status === 'ARCHIVED' && !this.archivedAt) {
    this.archivedAt = Date.now();
  }
  
  next();
});

/**
 * Notification model
 */
const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 