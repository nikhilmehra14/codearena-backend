const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const config = require('./config');
const logger = require('../utils/logger');

/**
 * Passport Configuration for OAuth Authentication
 * 
 * IMPORTANT: Passport strategies should ONLY extract profile data
 * and pass it to the controller. All database operations should be
 * handled by authService.oauthLogin() method.
 * 
 * Flow:
 * 1. Passport extracts profile from OAuth provider
 * 2. Passes profile to controller via req.user
 * 3. Controller calls authService.oauthLogin(req.user, provider)
 * 4. AuthService handles user creation/login with correct field names
 */

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth Strategy
if (config.oauth.google.clientID && config.oauth.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.oauth.google.clientID,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: config.oauth.google.callbackURL,
        passReqToCallback: true,
      },
      (req, accessToken, refreshToken, profile, done) => {
        try {
          // ONLY extract profile data - DO NOT create user here
          const userProfile = {
            id: profile.id,
            email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null,
            displayName: profile.displayName || profile.name?.givenName || 'User',
            photos: profile.photos || [],
            // This is just for identifying the provider in the flow
            // authService.oauthLogin() will use the 'provider' parameter passed to it
          };

          logger.info(`Google OAuth callback for user: ${userProfile.email}`);
          // Pass profile to controller - NO database operations here
          return done(null, userProfile);
        } catch (error) {
          logger.error('Error in Google OAuth callback:', error);
          return done(error, null);
        }
      }
    )
  );
  logger.info('✅ Google OAuth Strategy configured');
} else {
  logger.warn('⚠️  Google OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
}

// GitHub OAuth Strategy
if (config.oauth.github.clientID && config.oauth.github.clientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.oauth.github.clientID,
        clientSecret: config.oauth.github.clientSecret,
        callbackURL: config.oauth.github.callbackURL,
        scope: ['user:email'],
        passReqToCallback: true,
      },
      (req, accessToken, refreshToken, profile, done) => {
        try {
          // ONLY extract profile data - DO NOT create user here
          const userProfile = {
            id: profile.id,
            email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null,
            displayName: profile.displayName || profile.username || 'User',
            photos: profile.photos || (profile._json?.avatar_url ? [{ value: profile._json.avatar_url }] : []),
            // This is just for identifying the provider in the flow
            // authService.oauthLogin() will use the 'provider' parameter passed to it
          };

          logger.info(`GitHub OAuth callback for user: ${userProfile.email || profile.username}`);
          // Pass profile to controller - NO database operations here
          return done(null, userProfile);
        } catch (error) {
          logger.error('Error in GitHub OAuth callback:', error);
          return done(error, null);
        }
      }
    )
  );
  logger.info('✅ GitHub OAuth Strategy configured');
} else {
  logger.warn('⚠️  GitHub OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
}

module.exports = passport;
