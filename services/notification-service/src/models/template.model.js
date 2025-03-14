const mongoose = require('mongoose');

/**
 * Template Schema
 */
const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      unique: true,
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Template type is required'],
      enum: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'],
      uppercase: true
    },
    subject: {
      type: String,
      required: function() { return this.type === 'EMAIL'; },
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Template content is required']
    },
    variables: [{
      type: String,
      trim: true
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
templateSchema.index({ name: 1 });
templateSchema.index({ type: 1 });

/**
 * Pre-save middleware
 */
templateSchema.pre('save', function(next) {
  // Update the updatedAt field on every save
  this.updatedAt = Date.now();
  
  // Extract variables from content using {{variable}} pattern
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = this.content.match(variableRegex) || [];
  this.variables = matches.map(match => match.replace(/\{\{|\}\}/g, ''));
  
  next();
});

/**
 * Template model
 */
const Template = mongoose.model('Template', templateSchema);

module.exports = Template; 