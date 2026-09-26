import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/schemas';
import passport from 'passport';
import { config } from '../config';
import { generateToken } from '../utils/jwt';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validate(registerSchema),
  authController.register.bind(authController)
);

// POST /api/auth/login
router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  authController.login.bind(authController)
);

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout.bind(authController));

// GET /api/auth/me
router.get('/me', authenticate, authController.me.bind(authController));

// GET /api/auth/google - Initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// GET /api/auth/google/callback - Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.frontendUrl}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    // User is available from passport
    const user = req.user as any;
    const token = generateToken({ userId: user.id, email: user.email });

    // Redirect to frontend with token
    res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
  }
);

export default router;
