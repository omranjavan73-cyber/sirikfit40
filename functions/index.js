process.env.IS_FIREBASE = "true";

const { onRequest } = require("firebase-functions/v2/https");
const serverModule = require("./dist/server.cjs");

const app = serverModule.default || serverModule;

exports.api = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60,
    region: "us-central1"
  },
  app
);
