import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './index';
import { authService } from '../services/auth.service';

export function configurePassport(): void {
  // Only configure Google Strategy if credentials are available
  if (config.google.clientId && config.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackUrl,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const result = await authService.googleAuth({
              googleId: profile.id,
              email: profile.emails?.[0]?.value || '',
              name: profile.displayName || '',
              avatar: profile.photos?.[0]?.value,
            });

            done(null, result.user as any);
          } catch (error) {
            done(error as Error);
          }
        }
      )
    );
  } else {
    console.log('⚠️  Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
  }

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
}
