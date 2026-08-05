const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

let currentAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
let currentAdminUsername = process.env.ADMIN_USERNAME || 'admin';
let currentAdminEmail = process.env.ADMIN_EMAIL || 'admin@pharmacy.com';

/**
 * POST /api/auth/login
 * Admin Login using Username/Email and Password
 */
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const inputUser = (username || email || '').trim().toLowerCase();

    if (!inputUser || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter username/email and password.',
      });
    }

    let user;
    try {
      user = await User.findOne({
        $or: [{ username: inputUser }, { email: inputUser }],
      });
    } catch (dbErr) {
      user = null;
    }

    const expectedPassword = user ? user.password : currentAdminPassword;
    const isValidUsername =
      (user && (user.username === inputUser || user.email === inputUser)) ||
      inputUser === currentAdminUsername.toLowerCase() ||
      inputUser === currentAdminEmail.toLowerCase();

    if (!isValidUsername || password !== expectedPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    if (!user) {
      try {
        user = await User.create({
          username: currentAdminUsername,
          email: currentAdminEmail,
          password: currentAdminPassword,
          name: 'Pharmacy Admin',
          picture: 'https://ui-avatars.com/api/?name=Pharmacy+Admin&background=059669&color=fff',
          createdAt: new Date(),
          lastLogin: new Date(),
        });
      } catch (dbErr) {
        user = {
          _id: 'admin_local_id_123',
          username: currentAdminUsername,
          email: currentAdminEmail,
          name: 'Pharmacy Admin',
          picture: 'https://ui-avatars.com/api/?name=Pharmacy+Admin&background=059669&color=fff',
          lastLogin: new Date(),
        };
      }
    } else {
      user.lastLogin = new Date();
      try {
        await user.save();
      } catch (e) {}
    }

    const jwtSecret = process.env.JWT_SECRET || 'pharmaorder_local_fallback_secret_32_chars';

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Admin authentication successful',
      token,
      user: {
        id: user._id,
        username: user.username || currentAdminUsername,
        name: user.name || 'Pharmacy Admin',
        email: user.email || currentAdminEmail,
        picture: user.picture || '',
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return res.status(500).json({
      success: false,
      error: 'Admin authentication failed.',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change current Admin password
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 4 characters long.',
      });
    }

    let user;
    try {
      user = await User.findById(req.user.id);
    } catch (dbErr) {
      user = null;
    }

    const activePassword = user ? user.password : currentAdminPassword;

    if (currentPassword !== activePassword) {
      return res.status(400).json({
        success: false,
        error: 'Incorrect current password.',
      });
    }

    // Update password in DB or local memory
    if (user) {
      user.password = newPassword;
      await user.save();
    }
    currentAdminPassword = newPassword;

    console.log('[Auth] Admin password updated successfully');

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    console.error('Error in /api/auth/change-password:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update password.',
    });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    let user;
    try {
      user = await User.findById(req.user.id).select('-password -__v');
    } catch (dbErr) {
      user = null;
    }

    if (!user) {
      return res.status(200).json({
        success: true,
        user: {
          id: req.user.id,
          username: req.user.username || currentAdminUsername,
          name: req.user.name || 'Pharmacy Admin',
          email: req.user.email || currentAdminEmail,
          picture: '',
          lastLogin: new Date(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        picture: user.picture,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile.',
    });
  }
});

module.exports = router;
