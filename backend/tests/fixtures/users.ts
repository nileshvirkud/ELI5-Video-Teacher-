import bcrypt from 'bcryptjs';
import { SubscriptionTier } from '@prisma/client';

export const mockUsers = {
  freeUser: {
    email: 'free@test.com',
    password: 'Password123!',
    hashedPassword: bcrypt.hashSync('Password123!', 12),
    firstName: 'Free',
    lastName: 'User',
    subscriptionTier: SubscriptionTier.FREE,
    isEmailVerified: true
  },
  premiumUser: {
    email: 'premium@test.com',
    password: 'Password123!',
    hashedPassword: bcrypt.hashSync('Password123!', 12),
    firstName: 'Premium',
    lastName: 'User',
    subscriptionTier: SubscriptionTier.PREMIUM,
    isEmailVerified: true
  },
  unverifiedUser: {
    email: 'unverified@test.com',
    password: 'Password123!',
    hashedPassword: bcrypt.hashSync('Password123!', 12),
    firstName: 'Unverified',
    lastName: 'User',
    subscriptionTier: SubscriptionTier.FREE,
    isEmailVerified: false
  }
};

export const createTestUser = async (userData: any, prisma: any) => {
  return await prisma.user.create({
    data: {
      email: userData.email,
      password: userData.hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      subscriptionTier: userData.subscriptionTier,
      isEmailVerified: userData.isEmailVerified
    }
  });
};