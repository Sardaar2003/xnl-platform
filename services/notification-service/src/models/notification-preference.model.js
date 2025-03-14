const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true
    },
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    inApp: {
      type: Boolean,
      default: true
    },
    types: {
      type: Map,
      of: {
        email: {
          type: Boolean,
          default: true
        },
        sms: {
          type: Boolean,
          default: true
        },
        push: {
          type: Boolean,
          default: true
        },
        inApp: {
          type: Boolean,
          default: true
        }
      },
      default: () => ({
        transaction: {
          email: true,
          sms: true,
          push: true,
          inApp: true
        },
        account: {
          email: true,
          sms: false,
          push: true,
          inApp: true
        },
        security: {
          email: true,
          sms: true,
          push: true,
          inApp: true
        },
        marketing: {
          email: true,
          sms: false,
          push: false,
          inApp: true
        }
      })
    }
  },
  {
    timestamps: true
  }
);

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

module.exports = NotificationPreference; 