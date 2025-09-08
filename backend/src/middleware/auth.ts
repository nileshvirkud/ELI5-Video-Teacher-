import { Request, Response, NextFunction } from 'express';
import jwtUtils from '../utils/jwt';
import prisma from '../config/database';
import logger from '../config/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header provided' });
      return;
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const payload = jwtUtils.verifyAccessToken(token);
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        isEmailVerified: true
      }
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(401).json({ error: 'Email not verified' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Access token expired') {
        res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        return;
      } else if (error.message === 'Invalid access token') {
        res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
        return;
      }
    }

    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireSubscription = (requiredTier: 'PREMIUM' | 'UNLIMITED') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const tierHierarchy = {
      FREE: 0,
      PREMIUM: 1,
      UNLIMITED: 2
    };

    const userTierLevel = tierHierarchy[req.user.subscriptionTier as keyof typeof tierHierarchy];
    const requiredTierLevel = tierHierarchy[requiredTier];

    if (userTierLevel < requiredTierLevel) {
      res.status(403).json({ 
        error: 'Subscription upgrade required',
        requiredTier,
        currentTier: req.user.subscriptionTier
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      next();
      return;
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      next();
      return;
    }

    const payload = jwtUtils.verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        isEmailVerified: true
      }
    });

    if (user && user.isEmailVerified) {
      req.user = {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier
      };
    }

    next();
  } catch (error) {
    // Silently continue without authentication for optional auth
    next();
  }
};