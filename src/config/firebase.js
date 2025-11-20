const admin = require('firebase-admin');
const config = require('../config/config');
const logger = require('../utils/logger');
const fs = require('fs');

let firebaseApp = null;

// Initialize Firebase Admin
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (firebaseApp) {
      return firebaseApp;
    }

    // Initialize Firebase Admin SDK
    if (config.firebase.adminKeyPath && fs.existsSync(config.firebase.adminKeyPath)) {
      // Using service account key file
      const serviceAccount = require(config.firebase.adminKeyPath);

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.firebase.projectId,
      });
    } else if (config.firebase.privateKey && config.firebase.clientEmail) {
      // Using environment variables
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
          clientEmail: config.firebase.clientEmail,
        }),
      });
    } else {
      logger.warn('Firebase configuration not found. Push notifications will be disabled.');
      return null;
    }

    logger.info('✓ Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('✗ Firebase initialization failed:', error);
    return null;
  }
};

// Get Firebase messaging instance
const getMessaging = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }

  if (!firebaseApp) {
    throw new Error('Firebase not initialized');
  }

  return admin.messaging();
};

module.exports = {
  initializeFirebase,
  getMessaging,
};
