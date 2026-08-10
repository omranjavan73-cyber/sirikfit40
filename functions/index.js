// Firebase Cloud Functions entry point re-exporting Express app function 'api'
const path = require('path');
const distPath = path.join(__dirname, '../dist/server.cjs');

let apiModule;
try {
  apiModule = require(distPath);
} catch (_e) {
  // Fallback if built server is not yet compiled
  apiModule = {};
}

module.exports = {
  api: apiModule.api
};
