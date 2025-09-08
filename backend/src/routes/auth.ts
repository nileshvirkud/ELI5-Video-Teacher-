import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import jwtUtils from '../utils/jwt';
import logger from '../config/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('firstName').optional().isLength({ min: 1, max: 50 }).trim(),
  body('lastName').optional().isLength({ min: 1, max: 50 }).trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }

  const { email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: {
        message: 'User already exists with this email',
        code: 'USER_EXISTS'
      }
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      subscriptionTier: 'FREE'
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      subscriptionTier: true,
      createdAt: true
    }
  });

  // Generate tokens
  const accessToken = jwtUtils.generateAccessToken({
    userId: user.id,
    email: user.email,
    subscriptionTier: user.subscriptionTier
  });

  const refreshToken = jwtUtils.generateRefreshToken({
    userId: user.id,
    tokenVersion: 0
  });

  // Store refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken }
  });

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    data: {
      user,
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
}));

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }

  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      }
    });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      }
    });
  }

  // Generate tokens
  const accessToken = jwtUtils.generateAccessToken({
    userId: user.id,
    email: user.email,
    subscriptionTier: user.subscriptionTier
  });

  const refreshToken = jwtUtils.generateRefreshToken({
    userId: user.id,
    tokenVersion: 0
  });

  // Update user with new refresh token and last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken,
      lastLoginAt: new Date()
    }
  });

  logger.info(`User logged in: ${user.email}`);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionTier: user.subscriptionTier,
        isEmailVerified: user.isEmailVerified
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }
  });
}));

// Refresh token
router.post('/refresh', [
  body('refreshToken').notEmpty()
], asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Refresh token required',
        code: 'TOKEN_REQUIRED'
      }
    });
  }

  try {
    const payload = jwtUtils.verifyRefreshToken(refreshToken);
    
    // Find user and verify refresh token
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid refresh token',
          code: 'INVALID_TOKEN'
        }
      });
    }

    // Generate new tokens
    const newAccessToken = jwtUtils.generateAccessToken({
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    });

    const newRefreshToken = jwtUtils.generateRefreshToken({
      userId: user.id,
      tokenVersion: 0
    });

    // Update stored refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken }
    });

    res.json({
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid refresh token',
        code: 'INVALID_TOKEN'
      }
    });
  }
}));

// Logout
router.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { refreshToken: null }
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Get current user profile
router.get('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      subscriptionTier: true,
      isEmailVerified: true,
      createdAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          videos: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: { user }
  });
}));

// Update user profile
router.patch('/me', authenticate, [
  body('firstName').optional().isLength({ min: 1, max: 50 }).trim(),
  body('lastName').optional().isLength({ min: 1, max: 50 }).trim(),
  body('email').optional().isEmail().normalizeEmail()
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }

  const { firstName, lastName, email } = req.body;
  const updateData: any = {};

  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (email !== undefined) {
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: req.user!.id }
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already taken',
          code: 'EMAIL_TAKEN'
        }
      });
    }

    updateData.email = email;
    updateData.isEmailVerified = false; // Reset verification if email changes
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      subscriptionTier: true,
      isEmailVerified: true,
      updatedAt: true
    }
  });

  res.json({
    success: true,
    data: { user }
  });
}));

// Change password
router.patch('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }

  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      }
    });
  }

  // Check current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      }
    });
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // Update password and invalidate refresh token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedNewPassword,
      refreshToken: null
    }
  });

  logger.info(`Password changed for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

export default router;