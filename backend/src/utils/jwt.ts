import jwt from 'jsonwebtoken';
import logger from '../config/logger';

export interface TokenPayload {
  userId: string;
  email: string;
  subscriptionTier: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}

class JWTUtils {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'fallback-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  generateAccessToken(payload: TokenPayload): string {
    try {
      return jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'eli5-video-teacher',
        audience: 'eli5-users'
      });
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Token generation failed');
    }
  }

  generateRefreshToken(payload: RefreshTokenPayload): string {
    try {
      return jwt.sign(payload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'eli5-video-teacher',
        audience: 'eli5-users'
      });
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'eli5-video-teacher',
        audience: 'eli5-users'
      }) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else {
        logger.error('Error verifying access token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'eli5-video-teacher',
        audience: 'eli5-users'
      }) as RefreshTokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        logger.error('Error verifying refresh token:', error);
        throw new Error('Refresh token verification failed');
      }
    }
  }

  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  getTokenExpiry(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      return decoded && decoded.exp ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      logger.error('Error getting token expiry:', error);
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const expiry = this.getTokenExpiry(token);
      return expiry ? expiry < new Date() : true;
    } catch (error) {
      return true;
    }
  }
}

export default new JWTUtils();