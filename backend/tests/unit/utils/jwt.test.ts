import jwtUtils from '../../../src/utils/jwt';
import { TokenPayload, RefreshTokenPayload } from '../../../src/utils/jwt';

describe('JWT Utils', () => {
  const mockPayload: TokenPayload = {
    userId: 'user123',
    email: 'test@example.com',
    subscriptionTier: 'FREE'
  };

  const mockRefreshPayload: RefreshTokenPayload = {
    userId: 'user123',
    tokenVersion: 0
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = jwtUtils.generateRefreshToken(mockRefreshPayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);
      const decoded = jwtUtils.verifyAccessToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.subscriptionTier).toBe(mockPayload.subscriptionTier);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        jwtUtils.verifyAccessToken('invalid.token.here');
      }).toThrow('Invalid access token');
    });

    it('should throw error for expired token', () => {
      // Create a token with past expiry
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwic3Vic2NyaXB0aW9uVGllciI6IkZSRUUiLCJpYXQiOjE2MDA5NjAwMDAsImV4cCI6MTYwMDk2MDAwMSwiaXNzIjoiZWxpNS12aWRlby10ZWFjaGVyIiwiYXVkIjoiZWxpNS11c2VycyJ9.invalid';
      
      expect(() => {
        jwtUtils.verifyAccessToken(expiredToken);
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = jwtUtils.generateRefreshToken(mockRefreshPayload);
      const decoded = jwtUtils.verifyRefreshToken(token);
      
      expect(decoded.userId).toBe(mockRefreshPayload.userId);
      expect(decoded.tokenVersion).toBe(mockRefreshPayload.tokenVersion);
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);
      const decoded = jwtUtils.decodeToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe(mockPayload.userId);
    });

    it('should return null for invalid token', () => {
      const decoded = jwtUtils.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('getTokenExpiry', () => {
    it('should return expiry date for valid token', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);
      const expiry = jwtUtils.getTokenExpiry(token);
      
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = jwtUtils.generateAccessToken(mockPayload);
      const isExpired = jwtUtils.isTokenExpired(token);
      
      expect(isExpired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const isExpired = jwtUtils.isTokenExpired('invalid-token');
      expect(isExpired).toBe(true);
    });
  });
});