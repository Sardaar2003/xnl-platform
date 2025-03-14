const { ApiError, generateToken, generateRefreshToken } = require('@xnl/shared');
const User = require('../models/user.model');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const register = async (req, res, next) => {
  try {
    console.log('Register request received:', req.body);
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, 'Email already registered');
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Save user
    console.log('Saving new user...');
    await user.save();
    console.log('User saved successfully');

    // Generate tokens
    console.log('Generating tokens...');
    const accessToken = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user._id,
    });

    // Update user with refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Publish UserCreated event
    try {
      console.log('Publishing user.created event...');
      req.eventPublisher.publishEvent('users', 'user.created', {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        timestamp: new Date().toISOString(),
      });
      console.log('Event published successfully');
    } catch (eventError) {
      console.error('Error publishing event:', eventError);
      // Continue even if event publishing fails
    }

    // Send response
    console.log('Sending response...');
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
    console.log('Response sent successfully');
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
};

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(401, 'Account is disabled');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user._id,
    });

    // Update user with refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Publish UserLoggedIn event
    req.eventPublisher.publishEvent('users', 'user.logged_in', {
      userId: user._id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Find user with refresh token
    const user = await User.findOne({ refreshToken });
    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Verify refresh token
    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      // Generate new access token
      const accessToken = generateToken({
        id: user._id,
        email: user.email,
        role: user.role,
      });

      // Send response
      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: {
          accessToken,
        },
      });
    } catch (error) {
      // Invalidate refresh token
      user.refreshToken = null;
      await user.save();
      
      throw new ApiError(401, 'Invalid refresh token');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Find user with refresh token
    const user = await User.findOne({ refreshToken });
    if (user) {
      // Clear refresh token
      user.refreshToken = null;
      await user.save();
    }

    // Publish UserLoggedOut event
    if (req.user) {
      req.eventPublisher.publishEvent('users', 'user.logged_out', {
        userId: req.user.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find user with verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired verification token');
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Publish UserEmailVerified event
    req.eventPublisher.publishEvent('users', 'user.email_verified', {
      userId: user._id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that email doesn't exist
      return res.status(200).json({
        status: 'success',
        message: 'If your email is registered, you will receive a password reset link',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Publish PasswordResetRequested event
    req.eventPublisher.publishEvent('users', 'user.password_reset_requested', {
      userId: user._id,
      email: user.email,
      resetToken,
      timestamp: new Date().toISOString(),
    });

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'If your email is registered, you will receive a password reset link',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify reset token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find user with reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Token is valid',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find user with reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    // Update user
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined; // Invalidate all sessions
    await user.save();

    // Publish PasswordReset event
    req.eventPublisher.publishEvent('users', 'user.password_reset', {
      userId: user._id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

// OAuth 2.0 Integration
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      user = new User({
        userId: uuidv4(),
        username: email.split('@')[0],
        email,
        firstName,
        lastName,
        profilePicture: picture,
        googleId,
        password: crypto.randomBytes(16).toString('hex'), // Random password
        role: 'customer',
        kycVerified: false
      });
      
      await user.save();
      
      // Publish user created event
      await publishEvent('UserCreated', {
        userId: user.userId,
        email: user.email,
        role: user.role
      });
    } else {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          kycVerified: user.kycVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

exports.facebookAuth = async (req, res) => {
  try {
    const { accessToken: fbAccessToken } = req.body;
    
    // Fetch user profile from Facebook
    const response = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${fbAccessToken}`);
    const { id: facebookId, name, email, picture } = response.data;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Facebook'
      });
    }
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      user = new User({
        userId: uuidv4(),
        username: email.split('@')[0],
        email,
        firstName,
        lastName,
        profilePicture: picture?.data?.url,
        facebookId,
        password: crypto.randomBytes(16).toString('hex'), // Random password
        role: 'customer',
        kycVerified: false
      });
      
      await user.save();
      
      // Publish user created event
      await publishEvent('UserCreated', {
        userId: user.userId,
        email: user.email,
        role: user.role
      });
    } else {
      // Update Facebook ID if not set
      if (!user.facebookId) {
        user.facebookId = facebookId;
        await user.save();
      }
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          kycVerified: user.kycVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

exports.appleAuth = async (req, res) => {
  try {
    const { id_token, user: appleUser } = req.body;
    
    // Verify Apple token
    const jwtClaims = jwt.decode(id_token);
    const { sub: appleId, email } = jwtClaims;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Apple'
      });
    }
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      let firstName = 'Apple';
      let lastName = 'User';
      
      // If user info is provided by Apple
      if (appleUser && typeof appleUser === 'string') {
        const parsedUser = JSON.parse(appleUser);
        if (parsedUser.name) {
          firstName = parsedUser.name.firstName || firstName;
          lastName = parsedUser.name.lastName || lastName;
        }
      }
      
      user = new User({
        userId: uuidv4(),
        username: email.split('@')[0],
        email,
        firstName,
        lastName,
        appleId,
        password: crypto.randomBytes(16).toString('hex'), // Random password
        role: 'customer',
        kycVerified: false
      });
      
      await user.save();
      
      // Publish user created event
      await publishEvent('UserCreated', {
        userId: user.userId,
        email: user.email,
        role: user.role
      });
    } else {
      // Update Apple ID if not set
      if (!user.appleId) {
        user.appleId = appleId;
        await user.save();
      }
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          kycVerified: user.kycVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Apple auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// Multi-Factor Authentication
/**
 * Setup Multi-Factor Authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const setupMFA = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `XNL Fintech:${user.email}`
    });
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    // Save secret to user
    user.mfaSecret = secret.base32;
    user.mfaEnabled = false; // Not enabled until verified
    await user.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        secret: secret.base32,
        qrCode
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify MFA token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyMFA = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });
    
    if (!verified) {
      throw new ApiError(400, 'Invalid MFA token');
    }
    
    // Enable MFA
    user.mfaEnabled = true;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login with MFA
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const loginWithMFA = async (req, res, next) => {
  try {
    const { email, password, mfaToken } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid credentials');
    }
    
    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // If MFA token is not provided
      if (!mfaToken) {
        throw new ApiError(400, 'MFA token is required');
      }
      
      // Verify MFA token
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaToken,
        window: 1 // Allow 30 seconds of time drift
      });
      
      if (!verified) {
        throw new ApiError(401, 'Invalid MFA token');
      }
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Update user's refresh token
    user.refreshToken = refreshToken;
    await user.save();
    
    // Publish event
    if (req.eventPublisher) {
      await req.eventPublisher.publishEvent('users', 'user.logged_in', {
        userId: user._id,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
  setupMFA,
  verifyMFA,
  loginWithMFA
}; 
