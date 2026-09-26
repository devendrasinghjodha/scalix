import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../utils/errors';
import { User } from '@prisma/client';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Register a new user with email and password.
   */
  async register(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ user: Omit<User, 'password'>; token: string }> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Strip password from response
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  /**
   * Login with email and password.
   */
  async login(data: {
    email: string;
    password: string;
  }): Promise<{ user: Omit<User, 'password'>; token: string }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.password) {
      throw new BadRequestError(
        'This account uses Google login. Please sign in with Google.'
      );
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  /**
   * Handle Google OAuth login/register.
   */
  async googleAuth(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<{ user: Omit<User, 'password'>; token: string }> {
    // Check if user exists with this Google ID
    let user = await prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      // Check if user exists with this email (link accounts)
      user = await prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            avatar: profile.avatar || user.avatar,
          },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.googleId,
            avatar: profile.avatar,
          },
        });
      }
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  /**
   * Get user profile by ID.
   */
  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export const authService = new AuthService();
