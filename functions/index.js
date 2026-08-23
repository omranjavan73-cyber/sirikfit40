process.env.IS_FIREBASE_FUNCTION = "true";
const { onRequest } = require("firebase-functions/https");

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
