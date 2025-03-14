const twilio = require('twilio');
const AWS = require('aws-sdk');
const logger = require('./logger');

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize AWS SNS client
const sns = process.env.AWS_REGION
  ? new AWS.SNS({ region: process.env.AWS_REGION })
  : null;

/**
 * Send SMS using Twilio
 * @param {string} phoneNumber - The recipient's phone number in E.164 format
 * @param {string} message - The message to send
 * @returns {Promise<object>} - The result of the SMS sending operation
 */
const sendSMSViaTwilio = async (phoneNumber, message) => {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }
    
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    logger.info(`SMS sent via Twilio to ${phoneNumber}`, {
      sid: result.sid,
      status: result.status
    });
    
    return {
      success: true,
      provider: 'twilio',
      messageId: result.sid,
      status: result.status
    };
  } catch (error) {
    logger.error(`Failed to send SMS via Twilio to ${phoneNumber}`, {
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
};

/**
 * Send SMS using AWS SNS
 * @param {string} phoneNumber - The recipient's phone number in E.164 format
 * @param {string} message - The message to send
 * @returns {Promise<object>} - The result of the SMS sending operation
 */
const sendSMSViaSNS = async (phoneNumber, message) => {
  try {
    if (!sns) {
      throw new Error('AWS SNS client not initialized');
    }
    
    const params = {
      Message: message,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: process.env.SMS_SENDER_ID || 'XNLFintech'
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    };
    
    const result = await sns.publish(params).promise();
    
    logger.info(`SMS sent via AWS SNS to ${phoneNumber}`, {
      messageId: result.MessageId
    });
    
    return {
      success: true,
      provider: 'aws-sns',
      messageId: result.MessageId
    };
  } catch (error) {
    logger.error(`Failed to send SMS via AWS SNS to ${phoneNumber}`, {
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
};

/**
 * Send SMS using the configured provider
 * @param {string} phoneNumber - The recipient's phone number in E.164 format
 * @param {string} message - The message to send
 * @param {object} options - Additional options
 * @returns {Promise<object>} - The result of the SMS sending operation
 */
const sendSMS = async (phoneNumber, message, options = {}) => {
  try {
    // Validate phone number (basic E.164 format check)
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      throw new Error('Invalid phone number format. Must be in E.164 format (e.g., +1234567890)');
    }
    
    // Validate message length
    if (!message || message.length > 1600) {
      throw new Error('Message must be between 1 and 1600 characters');
    }
    
    // Determine which provider to use
    const provider = options.provider || process.env.SMS_PROVIDER || 'twilio';
    
    let result;
    
    switch (provider.toLowerCase()) {
      case 'twilio':
        result = await sendSMSViaTwilio(phoneNumber, message);
        break;
        
      case 'aws-sns':
      case 'sns':
        result = await sendSMSViaSNS(phoneNumber, message);
        break;
        
      default:
        throw new Error(`Unsupported SMS provider: ${provider}`);
    }
    
    return result;
  } catch (error) {
    logger.error('SMS sending failed', {
      phoneNumber,
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendSMS,
  sendSMSViaTwilio,
  sendSMSViaSNS
}; 