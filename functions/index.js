process.env.IS_FIREBASE_FUNCTION = "true";
const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

setGlobalOptions({ region: "us-central1" });

let app;
function getApp() {
  if (!app) {
    const serverModule = require("./dist/server.cjs");
    app = serverModule.default || serverModule.app || serverModule;
  }
  return app;
}

exports.api = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 60, memory: "1GiB" }, (req, res) => {
  return getApp()(req, res);
});

exports.syncproductprices = onSchedule(
  {
    schedule: "0 3 */3 * *",
    timeZone: "UTC",
    memory: "1GiB",
    timeoutSeconds: 540,
    maxInstances: 1
  },
  async (event) => {
    const serverModule = require("./dist/server.cjs");
    if (serverModule.runProductPriceSync) {
      await serverModule.runProductPriceSync();
    }
  }
);

// Warm-up / health-check endpoint — returns 200 "pong" immediately
exports.ping = onRequest({ cors: true, maxInstances: 2, timeoutSeconds: 10 }, (req, res) => {
  console.log('[ping] warm-up request received');
  res.status(200).send('pong');
});
