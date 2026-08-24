process.env.IS_FIREBASE_FUNCTION = "true";
const { onRequest } = require("firebase-functions/https");
const { onSchedule } = require("firebase-functions/scheduler");

let app;
function getApp() {
  if (!app) {
    const serverModule = require("./dist/server.cjs");
    app = serverModule.default || serverModule.app || serverModule;
  }
  return app;
}

exports.api = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 60 }, (req, res) => {
  return getApp()(req, res);
});

exports.syncProductPrices = onSchedule(
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

