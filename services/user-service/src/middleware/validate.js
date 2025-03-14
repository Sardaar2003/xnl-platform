const { validationResult } = require('express-validator');
const { ApiError } = require('@xnl/shared');

/**
 * Validation middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(new ApiError(400, errorMessages[0]));
  }
  next();
};

module.exports = validate; 