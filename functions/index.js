// Firebase Cloud Functions entry point re-exporting Express app function 'api'
process.env.IS_FIREBASE_FUNCTION = 'true';
process.env.FUNCTION_TARGET = process.env.FUNCTION_TARGET || 'api';
const fs = require('fs');
const path = require('path');
const { onRequest } = require('firebase-functions/v2/https');

const localDist = path.join(__dirname, './dist/server.cjs');
const parentDist = path.join(__dirname, '../dist/server.cjs');
const distPath = fs.existsSync(localDist) ? localDist : parentDist;

let apiFunction;

try {
  const serverModule = require(distPath);

  if (serverModule && serverModule.api && typeof serverModule.api === 'function') {
    apiFunction = serverModule.api;
  } else {
    // Inspect default export, app instance, or direct module export
    const expressApp = (serverModule && (serverModule.app || serverModule.default)) || serverModule;
    if (typeof expressApp === 'function') {
      apiFunction = onRequest(
        {
          cors: true,
          memory: '1GiB',
          timeoutSeconds: 60,
        },
        expressApp
      );
    }
  }
} catch (err) {
  console.warn('functions/index.js: Error inspecting dist/server.cjs:', err.message);
}

// Resilient fallback if server module is not built or fails to load
if (!apiFunction) {
  apiFunction = onRequest(
    { cors: true },
    (req, res) => {
      res.status(500).json({ error: 'Server API module not loaded. Please run "npm run build".' });
    }
  );
}

module.exports = {
  api: apiFunction
};
