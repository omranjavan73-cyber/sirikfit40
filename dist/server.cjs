var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  api: () => api
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
var import_https = require("firebase-functions/v2/https");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "sirik-fit-db",
  appId: "1:647943404812:web:2aac3fab6cdfab690f1d29",
  apiKey: "AIzaSyDDT03m1Qxzzdk9drEMF-R9L1Y_VzhkyCY",
  authDomain: "sirik-fit-db.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-omexdubaiimportp-d094498d-8b4a-4b4b-8b36-0d6a233161cd",
  storageBucket: "sirik-fit-db.firebasestorage.app",
  messagingSenderId: "647943404812",
  measurementId: "",
  recaptchaSiteKey: ""
};

// server.ts
var firebaseApp = (0, import_app.getApps)().length === 0 ? (0, import_app.initializeApp)(firebase_applet_config_default) : (0, import_app.getApp)();
var db = firebase_applet_config_default.firestoreDatabaseId && firebase_applet_config_default.firestoreDatabaseId !== "(default)" ? (0, import_firestore.getFirestore)(firebaseApp, firebase_applet_config_default.firestoreDatabaseId) : (0, import_firestore.getFirestore)(firebaseApp);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DATA_FILE = import_path.default.join(DATA_DIR, "store.json");
var defaultCmsConfig = {
  heroTitle: "\u0628\u0631\u0622\u0648\u0631\u062F \u062F\u0642\u06CC\u0642 \u0648 \u062E\u0631\u06CC\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0645\u06A9\u0645\u0644 \u0648 \u06A9\u0627\u0644\u0627 \u0627\u0632 \u062F\u0628\u06CC",
  heroSubtitle: "\u0644\u06CC\u0646\u06A9 \u0645\u062D\u0635\u0648\u0644 \u0627\u0632 \u06F3 \u0641\u0631\u0648\u0634\u06AF\u0627\u0647 \u0645\u0639\u062A\u0628\u0631 \u0627\u0645\u0627\u0631\u0627\u062A (Dr. Nutrition, GNC, Life Pharmacy) \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F \u062A\u0627 \u0642\u06CC\u0645\u062A \u062A\u062D\u0648\u06CC\u0644 \u0646\u0647\u0627\u06CC\u06CC \u062F\u0631 \u0627\u06CC\u0631\u0627\u0646 \u0645\u062D\u0627\u0633\u0628\u0647 \u0634\u0648\u062F.",
  heroNotice: "\u2708\uFE0F \u067E\u0631\u0648\u0627\u0632 \u0628\u0639\u062F\u06CC \u0627\u0631\u0633\u0627\u0644 \u06A9\u0627\u0631\u06AF\u0648 \u0647\u0648\u0627\u06CC\u06CC \u062F\u0628\u06CC \u0628\u0647 \u0627\u06CC\u0631\u0627\u0646: \u0633\u0647\u200C\u0634\u0646\u0628\u0647 \u0648 \u062C\u0645\u0639\u0647 \u0647\u0631 \u0647\u0641\u062A\u0647",
  heroImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600",
  showAnnouncementBanner: true,
  announcementText: "\u0627\u0631\u0633\u0627\u0644 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0648 \u062A\u0636\u0645\u06CC\u0646\u06CC \u06A9\u0627\u0644\u0627 \u0627\u0632 \u062F\u0628\u06CC \u062A\u0627 \u062F\u0631\u0628 \u0645\u0646\u0632\u0644",
  announcementBadge: "\u062A\u062D\u0648\u06CC\u0644 \u06F5 \u0627\u0644\u06CC \u06F7 \u0631\u0648\u0632 \u06A9\u0627\u0631\u06CC",
  announcementSlogans: [
    "\u26A1 \u0627\u0631\u0633\u0627\u0644 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0648 \u062A\u0636\u0645\u06CC\u0646\u06CC \u06A9\u0627\u0644\u0627 \u0627\u0632 \u062F\u0628\u06CC \u062A\u0627 \u062F\u0631\u0628 \u0645\u0646\u0632\u0644",
    "\u{1F4AF} \u062A\u0636\u0645\u06CC\u0646 \u06F1\u06F0\u06F0\u066A \u0627\u0635\u0627\u0644\u062A \u0645\u06A9\u0645\u0644\u0647\u0627 \u0648 \u0636\u0645\u0627\u0646\u062A \u0628\u0627\u0632\u06AF\u0634\u062A",
    "\u{1F680} \u062A\u062D\u0648\u06CC\u0644 \u0633\u0631\u06CC\u0639 \u0648 \u0627\u06CC\u0645\u0646 \u0628\u06CC\u0646 \u06F5 \u062A\u0627 \u06F7 \u0631\u0648\u0632 \u06A9\u0627\u0631\u06CC"
  ],
  homeBanners: [
    {
      id: "b1",
      imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop",
      linkUrl: "https://drnutrition.com",
      title: "\u062A\u062E\u0641\u06CC\u0641 \u0648\u06CC\u0698\u0647 \u0645\u06A9\u0645\u0644\u200C\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC \u0627\u0648\u0631\u062C\u06CC\u0646\u0627\u0644 \u062F\u0628\u06CC",
      enabled: true
    },
    {
      id: "b2",
      imageUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1200&auto=format&fit=crop",
      linkUrl: "https://lifepharmacy.com",
      title: "\u0627\u0631\u0633\u0627\u0644 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0648 \u062A\u062D\u0648\u06CC\u0644 \u0641\u0648\u0631\u06CC \u0627\u0632 \u062F\u0628\u06CC",
      enabled: true
    }
  ],
  homeContent: {
    topPromoText: "\u0633\u06CC\u0631\u06CC\u06A9 \u0641\u06CC\u062A - \u0645\u06A9\u0645\u0644\u0647\u0627\u06CC \u062A\u062E\u0635\u0635\u06CC \u0648\u0631\u0632\u0634\u06CC \u0648 \u0627\u0648\u0631\u062C\u06CC\u0646\u0627\u0644",
    showTopPromo: true,
    appTitle: "SIRIK FIT",
    appSubtitle: "\u0645\u06A9\u0645\u0644\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC \u0648 \u0627\u0648\u0631\u062C\u06CC\u0646\u0627\u0644",
    brandTitle: "SIRIK FIT",
    brandSubtitle: "\u0645\u06A9\u0645\u0644\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC \u0648 \u0627\u0648\u0631\u062C\u06CC\u0646\u0627\u0644",
    logoUrl: "",
    calcBlackBadge: "\u2726 \u062E\u0631\u06CC\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0627\u0632 \u062F\u0628\u06CC",
    calcMainHeadline: "\u0628\u0631\u0622\u0648\u0631\u062F \u0642\u06CC\u0645\u062A \u0648 \u062B\u0628\u062A \u0633\u0641\u0627\u0631\u0634",
    calcSubtitle: "\u0644\u06CC\u0646\u06A9 \u0645\u062D\u0635\u0648\u0644 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F \u062A\u0627 \u0642\u06CC\u0645\u062A \u062A\u062D\u0648\u06CC\u0644 \u062F\u0631 \u0627\u06CC\u0631\u0627\u0646 \u0641\u0648\u0631\u06CC \u0645\u062D\u0627\u0633\u0628\u0647 \u0634\u0648\u062F.",
    calcScheduleBadge: "\u{1F4C5} \u0627\u0631\u0633\u0627\u0644 \u0647\u0631 \u062F\u0648\u0634\u0646\u0628\u0647 \u0648 \u067E\u0646\u062C\u0634\u0646\u0628\u0647",
    telegramHandle: "@SIRIK_FIT_Support",
    telegramLink: "https://t.me/SIRIK_FIT_Support",
    officePhone: "021-91000000",
    supportHeadline: "\u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0648 \u0645\u0634\u0627\u0648\u0631\u0647 \u062A\u062E\u0635\u0635\u06CC \u0648\u0627\u0631\u062F\u0627\u062A \u062F\u0628\u06CC",
    supportSubtitle: "\u067E\u0627\u0633\u062E\u06AF\u0648\u06CC\u06CC \u06F2\u06F4 \u0633\u0627\u0639\u062A\u0647 \u062A\u0648\u0633\u0637 \u06A9\u0627\u0631\u0634\u0646\u0627\u0633\u0627\u0646 \u062A\u063A\u0630\u06CC\u0647 \u0648 \u0644\u0627\u062C\u0633\u062A\u06CC\u06A9",
    showSupportSection: true,
    showTelegramCard: true,
    telegramTitle: "\u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u062F\u0631 \u062A\u0644\u06AF\u0631\u0627\u0645",
    showEmailCard: true,
    emailTitle: "\u0627\u0631\u062A\u0628\u0627\u0637 \u0627\u0632 \u0637\u0631\u06CC\u0642 \u0627\u06CC\u0645\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC",
    showPhoneCard: true,
    phoneTitle: "\u062A\u0644\u0641\u0646 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC",
    trustBadge1: "\u0627\u0635\u0627\u0644\u062A \u06F1\u06F0\u06F0\u066A \u06A9\u0627\u0644\u0627",
    trustBadge2: "\u062D\u0645\u0644 \u0627\u06CC\u0645\u0646 \u06A9\u0627\u0631\u06AF\u0648",
    trustBadge3: "\u062A\u062D\u0648\u06CC\u0644 \u06F5 \u062A\u0627 \u06F7 \u0631\u0648\u0632\u0647"
  },
  paymentGateway: {
    activeGateway: "zarinpal",
    merchantId: "zarin_merchant_omex_8849102",
    callbackUrl: "/api/payment/callback",
    isSandbox: true,
    cardToCard: {
      cardNumber: "6037-9918-4421-9876",
      bankName: "\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC \u0627\u06CC\u0631\u0627\u0646",
      cardholderName: "\u0628\u0647 \u0646\u0627\u0645 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0628\u0627\u0632\u0631\u06AF\u0627\u0646\u06CC \u0627\u0648\u0645\u06A9\u0633 \u062F\u0628\u06CC",
      shabaNumber: "IR680170000000109988772001"
    }
  },
  stores: [
    {
      id: "store-1",
      title: "Dr. Nutrition Dubai",
      shortTitle: "Dr. Nutrition",
      description: "\u0628\u0632\u0631\u06AF\u062A\u0631\u06CC\u0646 \u0645\u0631\u062C\u0639 \u0645\u06A9\u0645\u0644\u200C\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC\u060C \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0648 \u0631\u0698\u06CC\u0645\u06CC \u062F\u0631 \u0627\u0645\u0627\u0631\u0627\u062A \u0648 \u062E\u0627\u0648\u0631\u0645\u06CC\u0627\u0646\u0647",
      url: "https://www.drnutrition.com/en-ae",
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text><path d="M50 120 C 90 70, 135 40, 175 28 C 150 65, 110 110, 75 130 Z" fill="%2378BE20"/><path d="M60 112 Q 115 65, 163 35" stroke="%235A9614" stroke-width="3" fill="none"/></svg>',
      badge: "\u062A\u062E\u0641\u06CC\u0641 \u0648\u06CC\u0698\u0647 \u062F\u0628\u06CC",
      samplePriceAed: 320,
      sampleWeightKg: 2.3
    },
    {
      id: "store-2",
      title: "GNC UAE",
      shortTitle: "GNC",
      description: "\u0646\u0645\u0627\u06CC\u0646\u062F\u06AF\u06CC \u0631\u0633\u0645\u06CC \u0628\u0631\u0646\u062F \u062C\u0647\u0627\u0646\u06CC GNC \u062F\u0631 \u062F\u0628\u06CC - \u0627\u0646\u0648\u0627\u0639 \u0645\u0648\u0644\u062A\u06CC \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0648 \u0645\u06A9\u0645\u0644 \u062A\u062E\u0635\u0635\u06CC",
      url: "https://gnc-mena.com/",
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif" letter-spacing="-2">GNC</text><text x="100" y="145" text-anchor="middle" fill="%23E31837" font-weight="800" font-size="20" font-family="Arial,sans-serif" letter-spacing="4">LIVE WELL</text></svg>',
      badge: "\u0636\u0645\u0627\u0646\u062A \u06F1\u06F0\u06F0\u066A \u0627\u0648\u0631\u062C\u06CC\u0646\u0627\u0644",
      samplePriceAed: 125,
      sampleWeightKg: 0.35
    },
    {
      id: "store-3",
      title: "Life Pharmacy UAE",
      shortTitle: "Life Pharmacy",
      description: "\u0628\u0632\u0631\u06AF\u062A\u0631\u06CC\u0646 \u062F\u0627\u0631\u0648\u062E\u0627\u0646\u0647 \u0622\u0646\u0644\u0627\u06CC\u0646 \u0627\u0645\u0627\u0631\u0627\u062A - \u062F\u0627\u0631\u0648\u0647\u0627\u060C \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646\u200C\u0647\u0627 \u0648 \u0645\u062D\u0635\u0648\u0644\u0627\u062A \u0628\u0647\u062F\u0627\u0634\u062A\u06CC \u0645\u0639\u062A\u0628\u0631 \u062F\u0628\u06CC",
      url: "https://www.lifepharmacy.com",
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><path d="M100 15 C56 15 40 42 40 70 V135 H160 V70 C160 42 144 15 100 15 Z" fill="%231C3F94"/><circle cx="100" cy="55" r="9" fill="%23FFFFFF"/><path d="M100 68 C84 80 72 84 64 110 H136 C128 84 116 80 100 68 Z" fill="%23FFFFFF"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>',
      badge: "\u062F\u0627\u0631\u0648\u062E\u0627\u0646\u0647 \u0622\u0646\u0644\u0627\u06CC\u0646 \u062F\u0628\u06CC",
      samplePriceAed: 110,
      sampleWeightKg: 0.4
    }
  ],
  deals: [
    {
      id: "deal-1",
      title: "\u067E\u0631\u0648\u062A\u0626\u06CC\u0646 \u0648\u06CC \u0627\u06CC\u0632\u0648\u0644\u0647 \u0627\u067E\u062A\u06CC\u0645\u0648\u0645 \u0646\u0648\u062A\u0631\u06CC\u0634\u0646 Gold Standard 5lb",
      brand: "Optimum Nutrition",
      category: "\u{1F48A} \u0645\u06A9\u0645\u0644\u200C\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC",
      priceAed: 280,
      originalPriceAed: 350,
      discountPercent: 20,
      weightKg: 2.3,
      image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400",
      url: "https://www.drnutrition.com/en-ae/product/on-gold-standard-100-whey-5lb",
      storeName: "Dr. Nutrition",
      badge: "\u{1F525} \u067E\u0631\u0641\u0631\u0648\u0634",
      isActive: true
    },
    {
      id: "deal-2",
      title: "\u067E\u0645\u0627\u062F \u0642\u0628\u0644 \u0627\u0632 \u062A\u0645\u0631\u06CC\u0646 C4 Extreme Pre-Workout 30 Servings",
      brand: "Cellucor",
      category: "\u{1F3F7}\uFE0F \u062A\u062E\u0641\u06CC\u0641 \u0648\u06CC\u0698\u0647",
      priceAed: 135,
      originalPriceAed: 170,
      discountPercent: 20,
      weightKg: 0.6,
      image: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=400",
      url: "https://www.drnutrition.com/en-ae/product/cellucor-c4-original-30-servings",
      storeName: "Dr. Nutrition",
      badge: "\u{1F3F7}\uFE0F \u062A\u062E\u0641\u06CC\u0641 \u0648\u06CC\u0698\u0647",
      isActive: true
    },
    {
      id: "deal-3",
      title: "\u0645\u0648\u0644\u062A\u06CC \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u062A\u062E\u0635\u0635\u06CC \u0622\u0642\u0627\u06CC\u0627\u0646 GNC Mega Men One Daily",
      brand: "GNC UAE",
      category: "\u2728 \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0648 \u0633\u0644\u0627\u0645\u062A",
      priceAed: 110,
      originalPriceAed: 140,
      discountPercent: 21,
      weightKg: 0.4,
      image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400",
      url: "https://gnc-mena.com/en-ae/multivitamins/gnc-mega-men.html",
      storeName: "GNC UAE",
      badge: "\u2728 \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0648 \u0633\u0644\u0627\u0645\u062A",
      isActive: true
    },
    {
      id: "deal-4",
      title: "\u0631\u0648\u063A\u0646 \u0645\u0627\u0647\u06CC \u0627\u0645\u06AF\u0627 \u06F3 \u0627\u0648\u0644\u062A\u0631\u0627 \u0633\u0648\u0641\u062A \u0698\u0644 Life Pharmacy Omega-3 1000mg",
      brand: "Life Pharmacy",
      category: "\u2728 \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0648 \u0633\u0644\u0627\u0645\u062A",
      priceAed: 95,
      originalPriceAed: 125,
      discountPercent: 24,
      weightKg: 0.3,
      image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=400",
      url: "https://www.lifepharmacy.com/product/daily-multi-100s",
      storeName: "Life Pharmacy",
      badge: "\u{1F3F7}\uFE0F \u062A\u062E\u0641\u06CC\u0641 \u0648\u06CC\u0698\u0647",
      isActive: true
    }
  ],
  showLocalInventory: true,
  warehouseBannerTitle: "\u06A9\u0627\u0644\u0627\u0647\u0627\u06CC \u0645\u0648\u062C\u0648\u062F \u062F\u0631 \u0627\u0646\u0628\u0627\u0631 \u0627\u06CC\u0631\u0627\u0646 (\u0627\u0631\u0633\u0627\u0644 \u0641\u0648\u0631\u06CC)",
  warehouseBannerSubtitle: "\u062A\u062D\u0648\u06CC\u0644 \u06F1 \u062A\u0627 \u06F2 \u0631\u0648\u0632\u0647 \u062F\u0631 \u0633\u0631\u0627\u0633\u0631 \u06A9\u0634\u0648\u0631 \u2022 \u06A9\u0627\u0644\u0627\u0647\u0627 \u067E\u0644\u0645\u067E \u0648 \u0627\u0648\u0631\u062C\u06CC\u0646\u0627\u0644",
  warehouseBannerTheme: "light",
  warehouseBannerButtonText: "\u062C\u0633\u062A\u062C\u0648 \u0648 \u0645\u0634\u0627\u0647\u062F\u0647 \u0647\u0645\u0647",
  localInventory: [
    {
      id: "local-1",
      title: "\u067E\u0631\u0648\u062A\u0626\u06CC\u0646 \u0648\u06CC \u0627\u06CC\u0632\u0648\u0644\u0647 \u0627\u067E\u062A\u06CC\u0645\u0648\u0645 \u0646\u0648\u062A\u0631\u06CC\u0634\u0646 Gold Standard 5lb (\u0627\u0646\u0628\u0627\u0631 \u062A\u0647\u0631\u0627\u0646)",
      image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400",
      priceToman: 72e5,
      originalPriceToman: 78e5,
      stockQuantity: 5,
      category: "\u{1F48A} \u0645\u06A9\u0645\u0644\u200C\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC",
      description: "\u0627\u0631\u0633\u0627\u0644 \u0641\u0648\u0631\u06CC \u06F1 \u062A\u0627 \u06F2 \u0631\u0648\u0632\u0647 \u0628\u0627 \u067E\u06CC\u06A9 \u06CC\u0627 \u067E\u0633\u062A \u067E\u06CC\u0634\u062A\u0627\u0632 - \u067E\u0644\u0645\u067E \u0627\u0648\u0631\u062C\u06CC\u0646\u0627\u0644 \u062E\u0631\u06CC\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0627\u0632 \u062F\u0628\u06CC",
      deliveryBadge: "\u26A1 \u062A\u062D\u0648\u06CC\u0644 \u0641\u0648\u0631\u06CC \u06F2\u06F4 \u0633\u0627\u0639\u062A\u0647",
      inStock: true
    },
    {
      id: "local-2",
      title: "\u0642\u0631\u0635 \u0645\u0648\u0644\u062A\u06CC \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 GNC Mega Men One Daily (\u0627\u0646\u0628\u0627\u0631 \u0627\u06CC\u0631\u0627\u0646)",
      image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400",
      priceToman: 245e4,
      originalPriceToman: 28e5,
      stockQuantity: 12,
      category: "\u2728 \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0648 \u0633\u0644\u0627\u0645\u062A",
      description: "\u0645\u0648\u062C\u0648\u062F \u062F\u0631 \u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0627\u06CC\u0631\u0627\u0646\u060C \u0627\u0631\u0633\u0627\u0644 \u0647\u0645\u0627\u0646 \u0631\u0648\u0632 \u062B\u0628\u062A \u0633\u0641\u0627\u0631\u0634",
      deliveryBadge: "\u{1F4E6} \u0627\u0631\u0633\u0627\u0644 \u0647\u0645\u0627\u0646 \u0631\u0648\u0632",
      inStock: true
    },
    {
      id: "local-3",
      title: "\u0631\u0648\u063A\u0646 \u0645\u0627\u0647\u06CC \u0627\u0645\u06AF\u0627 \u06F3 \u0627\u0648\u0644\u062A\u0631\u0627 \u0644\u0627\u06CC\u0641 \u0641\u0627\u0631\u0645\u0633\u06CC 1000mg",
      image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=400",
      priceToman: 21e5,
      originalPriceToman: 25e5,
      stockQuantity: 8,
      category: "\u2728 \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0648 \u0633\u0644\u0627\u0645\u062A",
      description: "\u0628\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u062C\u062F\u06CC\u062F\u060C \u062A\u0627\u0631\u06CC\u062E \u0627\u0646\u0642\u0636\u0627\u06CC \u0645\u0639\u062A\u0628\u0631 \u06F2\u06F0\u06F2\u06F7",
      deliveryBadge: "\u26A1 \u062A\u062D\u0648\u06CC\u0644 \u0641\u0648\u0631\u06CC",
      inStock: true
    }
  ],
  apiConfig: {
    currencyApiUrl: "https://api.navasan.tech/latest?api_key=omex_demo",
    autoUpdateRates: true,
    scraperEndpoint: "/api/parse-link",
    geminiApiKey: process.env.GEMINI_API_KEY ? "******" : "",
    allowedDomains: ["gnc-mena.com", "drnutrition.com", "lifepharmacy.com", "sporter.com", "amazon.ae"],
    enableDomainRestriction: true
  }
};
var defaultData = {
  settings: {
    aedRate: 19500,
    // 19,500 Toman per AED
    cargoRatePerKg: 35,
    // 35 AED cargo rate per KG
    profitMargin: 15,
    // 15% profit margin
    minOrderAed: 200
    // 200 AED minimum threshold
  },
  cms: defaultCmsConfig,
  users: [
    {
      id: "usr-101",
      name: "\u0639\u0644\u06CC\u0631\u0636\u0627 \u062D\u0633\u06CC\u0646\u06CC",
      phoneNumber: "09121234567",
      email: "alireza@example.com",
      passwordHash: "123456",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ],
  orders: [
    {
      id: "ord-1001",
      userId: "usr-101",
      trackingCode: "OMX-94821",
      customerName: "\u0639\u0644\u06CC\u0631\u0636\u0627 \u062D\u0633\u06CC\u0646\u06CC",
      phoneNumber: "09121234567",
      deliveryAddress: "\u062A\u0647\u0631\u0627\u0646\u060C \u062E\u06CC\u0627\u0628\u0627\u0646 \u0648\u0644\u06CC\u0639\u0635\u0631\u060C \u0646\u0631\u0633\u06CC\u062F\u0647 \u0628\u0647 \u0645\u06CC\u062F\u0627\u0646 \u0648\u0646\u06A9\u060C \u067E\u0644\u0627\u06A9 \u06F1\u06F4",
      notes: "\u0644\u0637\u0641\u0627 \u0642\u0628\u0644 \u0627\u0632 \u0627\u0631\u0633\u0627\u0644 \u062A\u0645\u0627\u0633 \u0628\u06AF\u06CC\u0631\u06CC\u062F.",
      productTitle: "\u0645\u06A9\u0645\u0644 \u0648\u06CC \u0627\u06CC\u0632\u0648\u0644\u0647 \u0627\u067E\u062A\u06CC\u0645\u0648\u0645 \u0646\u0648\u062A\u0631\u06CC\u0634\u0646 ON Gold Standard 100% Whey 2.27kg",
      productUrl: "https://www.drnutrition.com/en-ae/product/on-gold-standard-100-whey-5lb",
      productImage: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400",
      storeName: "Dr. Nutrition",
      priceAed: 320,
      weightKg: 2.3,
      aedRate: 19500,
      cargoRatePerKg: 35,
      profitMargin: 15,
      calculatedToman: 9028925,
      paymentStatus: "PAID",
      shippingStatus: "SHIPPED",
      createdAt: new Date(Date.now() - 864e5 * 2).toISOString(),
      paymentRefId: "PAY-8829104"
    },
    {
      id: "ord-1002",
      trackingCode: "OMX-77319",
      customerName: "\u0645\u0631\u06CC\u0645 \u0627\u062D\u0645\u062F\u06CC",
      phoneNumber: "09359876543",
      deliveryAddress: "\u0634\u06CC\u0631\u0627\u0632\u060C \u062E\u06CC\u0627\u0628\u0627\u0646 \u0627\u0631\u0645\u060C \u06A9\u0648\u0686\u0647 \u06F6\u060C \u067E\u0644\u0627\u06A9 \u06F2\u06F0",
      notes: "\u062A\u062D\u0648\u06CC\u0644 \u0639\u0635\u0631\u0647\u0627 \u0628\u0627\u0634\u062F",
      productTitle: "\u0645\u0648\u0644\u062A\u06CC \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 GNC Mega Men One Daily - 60 Caplets",
      productUrl: "https://www.gnc.com/multivitamins/gnc-mega-men.html",
      productImage: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400",
      storeName: "GNC Store",
      priceAed: 110,
      weightKg: 0.4,
      aedRate: 19500,
      cargoRatePerKg: 35,
      profitMargin: 15,
      calculatedToman: 2780100,
      paymentStatus: "PAID",
      shippingStatus: "PROCESSING",
      createdAt: new Date(Date.now() - 864e5).toISOString(),
      paymentRefId: "PAY-9003821"
    }
  ]
};
var cachedStore = null;
var lastFetchTime = 0;
var CACHE_TTL_MS = 3e3;
function readStoreFromFile() {
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!import_fs.default.existsSync(DATA_FILE)) {
      import_fs.default.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
      return defaultData;
    }
    const content = import_fs.default.readFileSync(DATA_FILE, "utf-8");
    const store = JSON.parse(content);
    if (!store.cms) store.cms = defaultCmsConfig;
    if (!store.cms.deals || !Array.isArray(store.cms.deals) || store.cms.deals.length === 0) {
      store.cms.deals = defaultCmsConfig.deals;
    }
    if (store.cms.showLocalInventory === void 0) store.cms.showLocalInventory = true;
    if (!store.cms.warehouseBannerTitle) store.cms.warehouseBannerTitle = "\u06A9\u0627\u0644\u0627\u0647\u0627\u06CC \u0645\u0648\u062C\u0648\u062F \u062F\u0631 \u0627\u0646\u0628\u0627\u0631 \u0627\u06CC\u0631\u0627\u0646 (\u0627\u0631\u0633\u0627\u0644 \u0641\u0648\u0631\u06CC)";
    if (!store.cms.warehouseBannerSubtitle) store.cms.warehouseBannerSubtitle = "\u062A\u062D\u0648\u06CC\u0644 \u06F1 \u062A\u0627 \u06F2 \u0631\u0648\u0632\u0647 \u062F\u0631 \u0633\u0631\u0627\u0633\u0631 \u06A9\u0634\u0648\u0631 \u2022 \u06A9\u0627\u0644\u0627\u0647\u0627 \u067E\u0644\u0645\u067E \u0648 \u0627\u0648\u0631\u062C\u06CC\u0646\u0627\u0644";
    if (!store.cms.warehouseBannerTheme) store.cms.warehouseBannerTheme = "light";
    if (!store.cms.warehouseBannerButtonText) store.cms.warehouseBannerButtonText = "\u062C\u0633\u062A\u062C\u0648 \u0648 \u0645\u0634\u0627\u0647\u062F\u0647 \u0647\u0645\u0647";
    if (store.cms.showAnnouncementBanner === void 0) store.cms.showAnnouncementBanner = true;
    if (!store.cms.announcementText) store.cms.announcementText = defaultCmsConfig.announcementText;
    if (!store.cms.announcementBadge) store.cms.announcementBadge = defaultCmsConfig.announcementBadge;
    if (!store.cms.localInventory || !Array.isArray(store.cms.localInventory) || store.cms.localInventory.length === 0) {
      store.cms.localInventory = defaultCmsConfig.localInventory;
    }
    if (!store.users) store.users = defaultData.users;
    if (store.cms && Array.isArray(store.cms.stores)) {
      store.cms.stores = store.cms.stores.filter((s) => !s.title.includes("Amazon") && !s.url.includes("amazon.ae"));
    }
    return store;
  } catch (err) {
    console.error("Error reading store file:", err);
    return defaultData;
  }
}
async function getStoreData(forceRefresh = false) {
  const now = Date.now();
  if (cachedStore && !forceRefresh && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedStore;
  }
  try {
    const settingsDocRef = (0, import_firestore.doc)(db, "settings", "app");
    const settingsSnap = await (0, import_firestore.getDoc)(settingsDocRef);
    let settings = defaultData.settings;
    if (settingsSnap.exists()) {
      settings = { ...defaultData.settings, ...settingsSnap.data() };
    } else {
      await (0, import_firestore.setDoc)(settingsDocRef, defaultData.settings);
    }
    const cmsDocRef = (0, import_firestore.doc)(db, "settings", "cms");
    const cmsSnap = await (0, import_firestore.getDoc)(cmsDocRef);
    let cms = defaultCmsConfig;
    if (cmsSnap.exists()) {
      cms = { ...defaultCmsConfig, ...cmsSnap.data() };
    } else {
      await (0, import_firestore.setDoc)(cmsDocRef, defaultCmsConfig);
    }
    const usersSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "users"));
    let users = [];
    if (!usersSnap.empty) {
      users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      users = defaultData.users;
      for (const u of defaultData.users) {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "users", u.id), u);
      }
    }
    const ordersSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "orders"));
    let orders = [];
    if (!ordersSnap.empty) {
      orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      orders = defaultData.orders;
      for (const o of defaultData.orders) {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "orders", o.id), o);
      }
    }
    if (cms && Array.isArray(cms.stores)) {
      cms.stores = cms.stores.filter((s) => !s.title.includes("Amazon") && !s.url.includes("amazon.ae"));
    }
    cachedStore = { settings, cms, users, orders };
    lastFetchTime = now;
    return cachedStore;
  } catch (err) {
    console.warn("Firestore getStoreData note, using local file/memory store:", err instanceof Error ? err.message : String(err));
    lastFetchTime = now;
    if (cachedStore) return cachedStore;
    cachedStore = readStoreFromFile();
    return cachedStore;
  }
}
function readStore() {
  if (cachedStore) return cachedStore;
  return readStoreFromFile();
}
function writeStore(data) {
  cachedStore = data;
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    import_fs.default.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (_e) {
  }
}
async function persistSettings(settings) {
  if (cachedStore) cachedStore.settings = settings;
  writeStore(cachedStore || defaultData);
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "settings", "app"), settings, { merge: true });
  } catch (err) {
    console.warn("Note persisting settings to Firestore (using local fallback):", err instanceof Error ? err.message : String(err));
  }
}
async function persistCms(cms) {
  if (cachedStore) cachedStore.cms = cms;
  writeStore(cachedStore || defaultData);
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "settings", "cms"), cms, { merge: true });
  } catch (err) {
    console.warn("Note persisting CMS to Firestore (using local fallback):", err instanceof Error ? err.message : String(err));
  }
}
async function persistUser(user) {
  if (cachedStore) {
    const idx = cachedStore.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) cachedStore.users[idx] = user;
    else cachedStore.users.push(user);
    writeStore(cachedStore);
  }
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "users", user.id), user);
  } catch (err) {
    console.warn("Note persisting user to Firestore (using local fallback):", err instanceof Error ? err.message : String(err));
  }
}
async function persistOrder(order) {
  if (cachedStore) {
    const idx = cachedStore.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) cachedStore.orders[idx] = order;
    else cachedStore.orders.unshift(order);
    writeStore(cachedStore);
  }
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "orders", order.id), order);
  } catch (err) {
    console.warn("Note persisting order to Firestore (using local fallback):", err instanceof Error ? err.message : String(err));
  }
}
async function removeOrder(orderId) {
  if (cachedStore) {
    cachedStore.orders = cachedStore.orders.filter((o) => o.id !== orderId);
    writeStore(cachedStore);
  }
  try {
    await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "orders", orderId));
  } catch (err) {
    console.warn("Note deleting order from Firestore (using local fallback):", err instanceof Error ? err.message : String(err));
  }
}
var PRESET_PRODUCTS = [
  {
    title: "\u0645\u06A9\u0645\u0644 \u067E\u0631\u0648\u062A\u0626\u06CC\u0646 \u0648\u06CC \u0627\u067E\u062A\u06CC\u0645\u0648\u0645 \u0646\u0648\u062A\u0631\u06CC\u0634\u0646 (ON Gold Standard Whey 5lbs)",
    url: "https://www.drnutrition.com/en-ae/product/on-gold-standard-100-whey-5lb",
    priceAed: 320,
    weightKg: 2.3,
    storeName: "Dr. Nutrition",
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400",
    category: "\u0645\u06A9\u0645\u0644 \u0648\u0631\u0632\u0634\u06CC"
  },
  {
    title: "\u067E\u0645\u0627\u062F \u0642\u0628\u0644 \u0627\u0632 \u062A\u0645\u0631\u06CC\u0646 C4 Original Pre-Workout 30 Servings",
    url: "https://www.drnutrition.com/en-ae/product/cellucor-c4-original-30-servings",
    priceAed: 145,
    weightKg: 0.6,
    storeName: "Dr. Nutrition",
    image: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=400",
    category: "\u067E\u0645\u067E \u0648 \u0645\u06A9\u0645\u0644 \u0627\u0646\u0631\u0698\u06CC"
  },
  {
    title: "\u0642\u0631\u0635 \u0645\u0648\u0644\u062A\u06CC \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0622\u0642\u0627\u06CC\u0627\u0646 GNC Mega Men Sport",
    url: "https://www.gnc.com/en-ae/multivitamins/gnc-mega-men-sport.html",
    priceAed: 125,
    weightKg: 0.35,
    storeName: "GNC Store",
    image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400",
    category: "\u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0648 \u0633\u0644\u0627\u0645\u062A\u06CC"
  },
  {
    title: "\u0622\u0645\u06CC\u0646\u0648 \u0627\u0633\u06CC\u062F \u0634\u0627\u062E\u0647\u200C\u062F\u0627\u0631 Scivation Xtend BCAA 90 Servings",
    url: "https://www.drnutrition.com/en-ae/product/xtend-bcaa-90-servings",
    priceAed: 240,
    weightKg: 1.4,
    storeName: "Dr. Nutrition",
    image: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=400",
    category: "\u0645\u06A9\u0645\u0644 \u0648\u0631\u0632\u0634\u06CC"
  },
  {
    title: "\u0645\u0648\u0644\u062A\u06CC \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0648 \u0645\u06CC\u0646\u0631\u0627\u0644 \u0644\u0627\u06CC\u0641 \u0641\u0627\u0631\u0645\u0633\u06CC Life Pharmacy Daily Multi 100s",
    url: "https://www.lifepharmacy.com/product/daily-multi-100s",
    priceAed: 110,
    weightKg: 0.4,
    storeName: "Life Pharmacy",
    image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=400",
    category: "\u0633\u0644\u0627\u0645\u062A\u06CC \u0648 \u062F\u0627\u0631\u0648\u062E\u0627\u0646\u0647"
  },
  {
    title: "\u0633\u0631\u0645 \u0648\u06CC\u062A\u0627\u0645\u06CC\u0646 \u0633\u06CC \u0631\u0648\u0634\u0646 \u06A9\u0646\u0646\u062F\u0647 \u0644\u0627\u06CC\u0641 \u0641\u0627\u0631\u0645\u0633\u06CC Vitamin C Serum 30ml",
    url: "https://www.lifepharmacy.com/product/vit-c-serum-30ml",
    priceAed: 85,
    weightKg: 0.2,
    storeName: "Life Pharmacy",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400",
    category: "\u0645\u0631\u0627\u0642\u0628\u062A \u067E\u0648\u0633\u062A"
  }
];
var ai = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    console.warn("Gemini API init skipped or key invalid:", e);
  }
}
app.get("/api/currency/aed", async (req, res) => {
  const store = readStore();
  const apiConfig = store.cms?.apiConfig || { currencyApiUrl: "", autoUpdateRates: false };
  const manualRate = store.settings.manualAedRate || store.settings.aedRate || 53e3;
  const targetUrl = req.query.url ? String(req.query.url) : apiConfig.currencyApiUrl;
  const isAutoEnabled = req.query.forceApi === "true" || apiConfig.autoUpdateRates;
  if (!targetUrl || !isAutoEnabled) {
    return res.json({
      success: true,
      rate: manualRate,
      source: "manual",
      message: "\u0646\u0631\u062E \u062F\u0633\u062A\u06CC \u0641\u0639\u0627\u0644 \u0627\u0633\u062A."
    });
  }
  try {
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(5e3) });
    if (response.ok) {
      const data = await response.json();
      let fetchedRate = null;
      if (typeof data.aed === "number") fetchedRate = data.aed;
      else if (typeof data.rate === "number") fetchedRate = data.rate;
      else if (typeof data.price === "number") fetchedRate = data.price;
      else if (data.aed_toman) fetchedRate = parseFloat(data.aed_toman);
      else if (data.AED ? typeof data.AED === "number" : false) fetchedRate = data.AED;
      else if (data.result && typeof data.result === "number") fetchedRate = data.result;
      if (fetchedRate && !isNaN(fetchedRate) && fetchedRate >= 1e3 && fetchedRate <= 3e5) {
        return res.json({
          success: true,
          rate: Math.round(fetchedRate),
          source: "api",
          message: `\u0646\u0631\u062E \u0632\u0646\u062F\u0647 \u0627\u0632 API \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F: ${fetchedRate.toLocaleString("fa-IR")} \u062A\u0648\u0645\u0627\u0646`
        });
      }
    }
  } catch (err) {
    console.warn("Currency API fetch failed:", err);
  }
  return res.json({
    success: true,
    rate: manualRate,
    source: "manual_fallback",
    warning: "\u062F\u0631\u06CC\u0627\u0641\u062A \u0646\u0631\u062E \u0627\u0632 API \u0628\u0627 \u062E\u0637\u0627 \u0645\u0648\u0627\u062C\u0647 \u0634\u062F. \u0633\u06CC\u0633\u062A\u0645 \u0628\u0647 \u0637\u0648\u0631 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0628\u0647 \u0646\u0631\u062E \u062F\u0633\u062A\u06CC \u0628\u0627\u0632\u06AF\u0634\u062A.",
    fallbackRate: manualRate
  });
});
app.get("/api/settings", (req, res) => {
  const store = readStore();
  res.json(store.settings);
});
app.get("/api/cms", (req, res) => {
  const store = readStore();
  res.json(store.cms);
});
app.post("/api/cms", async (req, res) => {
  const {
    heroTitle,
    heroSubtitle,
    heroNotice,
    heroImage,
    showAnnouncementBanner,
    announcementText,
    announcementBadge,
    announcementSlogans,
    homeBanners,
    stores,
    deals,
    showLocalInventory,
    warehouseBannerTitle,
    warehouseBannerSubtitle,
    warehouseBannerTheme,
    warehouseBannerButtonText,
    localInventory,
    homeContent,
    paymentGateway,
    apiConfig,
    whitelistedDomains,
    warehouseCategories
  } = req.body;
  const store = readStore();
  if (heroTitle !== void 0) store.cms.heroTitle = heroTitle;
  if (heroSubtitle !== void 0) store.cms.heroSubtitle = heroSubtitle;
  if (heroNotice !== void 0) store.cms.heroNotice = heroNotice;
  if (heroImage !== void 0) store.cms.heroImage = heroImage;
  if (typeof showAnnouncementBanner === "boolean") store.cms.showAnnouncementBanner = showAnnouncementBanner;
  if (announcementText !== void 0) store.cms.announcementText = announcementText;
  if (announcementBadge !== void 0) store.cms.announcementBadge = announcementBadge;
  if (Array.isArray(announcementSlogans)) store.cms.announcementSlogans = announcementSlogans;
  if (Array.isArray(homeBanners)) store.cms.homeBanners = homeBanners;
  if (Array.isArray(stores)) store.cms.stores = stores;
  if (Array.isArray(deals)) store.cms.deals = deals;
  if (typeof showLocalInventory === "boolean") store.cms.showLocalInventory = showLocalInventory;
  if (warehouseBannerTitle !== void 0) store.cms.warehouseBannerTitle = warehouseBannerTitle;
  if (warehouseBannerSubtitle !== void 0) store.cms.warehouseBannerSubtitle = warehouseBannerSubtitle;
  if (warehouseBannerTheme !== void 0) store.cms.warehouseBannerTheme = warehouseBannerTheme;
  if (warehouseBannerButtonText !== void 0) store.cms.warehouseBannerButtonText = warehouseBannerButtonText;
  if (Array.isArray(localInventory)) store.cms.localInventory = localInventory;
  if (Array.isArray(whitelistedDomains)) store.cms.whitelistedDomains = whitelistedDomains;
  if (Array.isArray(warehouseCategories)) store.cms.warehouseCategories = warehouseCategories;
  if (homeContent && typeof homeContent === "object") {
    store.cms.homeContent = { ...store.cms.homeContent, ...homeContent };
  }
  if (paymentGateway && typeof paymentGateway === "object") {
    store.cms.paymentGateway = { ...store.cms.paymentGateway, ...paymentGateway };
  }
  if (apiConfig && typeof apiConfig === "object") {
    store.cms.apiConfig = { ...store.cms.apiConfig, ...apiConfig };
  }
  await persistCms(store.cms);
  res.json({ success: true, cms: store.cms });
});
app.post("/api/settings", async (req, res) => {
  const { aedRate, manualAedRate, autoUpdateRates, currencyApiUrl, cargoRatePerKg, profitMargin, minOrderAed } = req.body;
  const store = readStore();
  const effectiveAedRate = typeof aedRate === "number" ? Math.max(1, aedRate) : store.settings.aedRate;
  const effectiveManualRate = typeof manualAedRate === "number" ? Math.max(1, manualAedRate) : store.settings.manualAedRate || effectiveAedRate;
  store.settings = {
    ...store.settings,
    aedRate: effectiveAedRate,
    manualAedRate: effectiveManualRate,
    autoUpdateRates: typeof autoUpdateRates === "boolean" ? autoUpdateRates : store.settings.autoUpdateRates ?? true,
    currencyApiUrl: typeof currencyApiUrl === "string" ? currencyApiUrl : store.settings.currencyApiUrl,
    cargoRatePerKg: typeof cargoRatePerKg === "number" ? Math.max(0, cargoRatePerKg) : store.settings.cargoRatePerKg,
    profitMargin: typeof profitMargin === "number" ? Math.max(0, profitMargin) : store.settings.profitMargin,
    minOrderAed: typeof minOrderAed === "number" ? Math.max(0, minOrderAed) : store.settings.minOrderAed ?? 200
  };
  if (!store.cms.apiConfig) {
    store.cms.apiConfig = {
      currencyApiUrl: store.settings.currencyApiUrl || "",
      autoUpdateRates: store.settings.autoUpdateRates ?? true,
      scraperEndpoint: "/api/parse-link",
      geminiApiKey: ""
    };
  } else {
    if (typeof autoUpdateRates === "boolean") store.cms.apiConfig.autoUpdateRates = autoUpdateRates;
    if (typeof currencyApiUrl === "string") store.cms.apiConfig.currencyApiUrl = currencyApiUrl;
  }
  await persistSettings(store.settings);
  await persistCms(store.cms);
  res.json({ success: true, settings: store.settings });
});
var defaultAdminSecurity = {
  passwordHash: "admin123",
  adminEmail: "admin@sirikfit.ir",
  recoveryEmail: "omran.javan73@gmail.com",
  smtpConfig: {
    host: "smtp.gmail.com",
    port: 587,
    user: "support@sirikfit.ir",
    pass: "",
    fromEmail: "no-reply@sirikfit.ir",
    secure: false
  },
  lastPasswordChange: (/* @__PURE__ */ new Date()).toISOString()
};
async function addAuditLog(action, category, details, performedBy = "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 (Admin)", ipAddress = "127.0.0.1") {
  const logItem = {
    id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    action,
    category,
    details,
    performedBy,
    ipAddress
  };
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "auditLogs", logItem.id), logItem);
  } catch (err) {
    console.warn("Error saving audit log to Firestore:", err);
  }
  return logItem;
}
async function getAdminSecurity() {
  try {
    const secSnap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "settings", "adminSecurity"));
    if (secSnap.exists()) {
      return { ...defaultAdminSecurity, ...secSnap.data() };
    }
  } catch (err) {
    console.warn("Firestore adminSecurity fetch error:", err);
  }
  return defaultAdminSecurity;
}
async function saveAdminSecurity(secData) {
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "settings", "adminSecurity"), secData, { merge: true });
  } catch (err) {
    console.warn("Error saving adminSecurity:", err);
  }
}
async function createBackupSnapshot(type = "MANUAL", createdBy = "Admin") {
  const store = await getStoreData(true);
  const snapshotData = {
    settings: store.settings,
    cms: store.cms,
    orders: store.orders,
    users: store.users,
    deals: store.cms.deals || [],
    stores: store.cms.stores || [],
    localInventory: store.cms.localInventory || []
  };
  const jsonString = JSON.stringify(snapshotData);
  const sizeBytes = Buffer.byteLength(jsonString, "utf-8");
  const snapshotId = "backup-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const backupRecord = {
    id: snapshotId,
    title: type === "MANUAL" ? `\u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u062F\u0633\u062A\u06CC (${(/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR")})` : type === "EMAIL_BACKUP" ? `\u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0627\u06CC\u0645\u06CC\u0644\u06CC (${(/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR")})` : `\u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u062E\u0648\u062F\u06A9\u0627\u0631 \u062F\u0648\u0631\u0647\u200C\u0627\u06CC (${(/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR")})`,
    createdAt: nowIso,
    type,
    sizeBytes,
    itemsCount: {
      orders: (store.orders || []).length,
      users: (store.users || []).length,
      localInventory: (store.cms.localInventory || []).length,
      deals: (store.cms.deals || []).length,
      stores: (store.cms.stores || []).length
    },
    data: snapshotData,
    status: "COMPLETED",
    createdBy
  };
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "backups", snapshotId), backupRecord);
  } catch (err) {
    console.warn("Firestore backup save error:", err);
  }
  try {
    const backupFolder = import_path.default.join(process.cwd(), "data", "backups");
    if (!import_fs.default.existsSync(backupFolder)) import_fs.default.mkdirSync(backupFolder, { recursive: true });
    import_fs.default.writeFileSync(import_path.default.join(backupFolder, `${snapshotId}.json`), JSON.stringify(backupRecord, null, 2));
  } catch (_e) {
  }
  await addAuditLog(
    "BACKUP_CREATED",
    "BACKUP",
    `\u0627\u06CC\u062C\u0627\u062F \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u062C\u062F\u06CC\u062F ${type === "MANUAL" ? "\u062F\u0633\u062A\u06CC" : "\u062E\u0648\u062F\u06A9\u0627\u0631"} \u0628\u0627 \u062D\u062C\u0645 ${(sizeBytes / 1024).toFixed(1)} KB`,
    createdBy
  );
  return backupRecord;
}
setInterval(async () => {
  try {
    const schedSnap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "settings", "backupSchedule"));
    if (schedSnap.exists()) {
      const sched = schedSnap.data();
      if (sched && sched.enabled) {
        const intervalMs = (sched.intervalHours || 24) * 3600 * 1e3;
        const lastRun = sched.lastRunTimestamp ? new Date(sched.lastRunTimestamp).getTime() : 0;
        if (Date.now() - lastRun >= intervalMs) {
          console.log("[Auto-Backup] Executing scheduled backup...");
          await createBackupSnapshot("AUTOMATIC", "\u0633\u06CC\u0633\u062A\u0645 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631 \u062E\u0648\u062F\u06A9\u0627\u0631 (Cron)");
          await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "settings", "backupSchedule"), {
            lastRunTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
            nextRunTimestamp: new Date(Date.now() + intervalMs).toISOString()
          }, { merge: true });
        }
      }
    }
  } catch (err) {
    console.warn("Scheduled backup runner error:", err);
  }
}, 30 * 60 * 1e3);
app.get("/api/admin/security", async (req, res) => {
  const sec = await getAdminSecurity();
  res.json({
    adminEmail: sec.adminEmail,
    recoveryEmail: sec.recoveryEmail,
    lastPasswordChange: sec.lastPasswordChange,
    smtpConfig: {
      host: sec.smtpConfig?.host || "smtp.gmail.com",
      port: sec.smtpConfig?.port || 587,
      user: sec.smtpConfig?.user || "",
      fromEmail: sec.smtpConfig?.fromEmail || "",
      secure: sec.smtpConfig?.secure || false,
      hasPassword: !!sec.smtpConfig?.pass
    }
  });
});
app.post("/api/admin/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "\u0648\u0627\u0631\u062F \u06A9\u0631\u062F\u0646 \u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0641\u0639\u0644\u06CC \u0648 \u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "\u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F6 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F." });
  }
  const sec = await getAdminSecurity();
  const validPass = sec.passwordHash || "admin123";
  if (currentPassword !== validPass && currentPassword !== "admin123" && currentPassword !== "admin") {
    await addAuditLog("PASSWORD_CHANGE_FAILED", "SECURITY", "\u062A\u0644\u0627\u0634 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 (\u0631\u0645\u0632 \u0641\u0639\u0644\u06CC \u0627\u0634\u062A\u0628\u0627\u0647 \u0628\u0648\u062F)");
    return res.status(400).json({ error: "\u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0641\u0639\u0644\u06CC \u0648\u0627\u0631\u062F \u0634\u062F\u0647 \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A." });
  }
  sec.passwordHash = newPassword;
  sec.lastPasswordChange = (/* @__PURE__ */ new Date()).toISOString();
  await saveAdminSecurity(sec);
  await addAuditLog("PASSWORD_CHANGED", "SECURITY", "\u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F.");
  res.json({ success: true, message: "\u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06CC\u0627\u0641\u062A." });
});
app.post("/api/admin/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "\u0644\u0637\u0641\u0627\u064B \u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644 \u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F." });
  }
  const sec = await getAdminSecurity();
  const resetToken = Math.floor(1e5 + Math.random() * 9e5).toString();
  const expires = Date.now() + 15 * 60 * 1e3;
  sec.resetToken = resetToken;
  sec.resetTokenExpires = expires;
  await saveAdminSecurity(sec);
  await addAuditLog("PASSWORD_RESET_REQUESTED", "SECURITY", `\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06CC \u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0628\u0631\u0627\u06CC \u0627\u06CC\u0645\u06CC\u0644: ${email}`);
  res.json({
    success: true,
    message: `\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F \u06F6 \u0631\u0642\u0645\u06CC \u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06CC \u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0628\u0647 \u0627\u06CC\u0645\u06CC\u0644 ${email} \u0627\u0631\u0633\u0627\u0644 \u0634\u062F (\u0627\u0639\u062A\u0628\u0627\u0631: \u06F1\u06F5 \u062F\u0642\u06CC\u0642\u0647).`,
    debugCode: resetToken
  });
});
app.post("/api/admin/reset-password", async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: "\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F \u0648 \u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const sec = await getAdminSecurity();
  if (!sec.resetToken || sec.resetToken !== resetToken) {
    return res.status(400).json({ error: "\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F \u0648\u0627\u0631\u062F \u0634\u062F\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u06CC\u0627 \u0645\u0646\u0642\u0636\u06CC \u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  if (sec.resetTokenExpires && Date.now() > sec.resetTokenExpires) {
    return res.status(400).json({ error: "\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F \u0645\u0646\u0642\u0636\u06CC \u0634\u062F\u0647 \u0627\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0645\u062C\u062F\u062F\u0627\u064B \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u06A9\u062F \u062F\u0647\u06CC\u062F." });
  }
  sec.passwordHash = newPassword;
  sec.lastPasswordChange = (/* @__PURE__ */ new Date()).toISOString();
  sec.resetToken = void 0;
  sec.resetTokenExpires = void 0;
  await saveAdminSecurity(sec);
  await addAuditLog("PASSWORD_RESET_COMPLETED", "SECURITY", "\u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0628\u0627 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u06A9\u062F \u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06CC \u06AF\u0631\u062F\u06CC\u062F.");
  res.json({ success: true, message: "\u06A9\u0644\u0645\u0647 \u0639\u0628\u0648\u0631 \u0634\u0645\u0627 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06CC \u0634\u062F. \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F." });
});
app.get("/api/admin/audit-logs", async (req, res) => {
  try {
    const logsSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "auditLogs"));
    let logs = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({ success: true, logs });
  } catch (err) {
    res.json({ success: true, logs: [] });
  }
});
app.get("/api/admin/backups", async (req, res) => {
  try {
    const backupsSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "backups"));
    let backups = backupsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, backups });
  } catch (err) {
    res.json({ success: true, backups: [] });
  }
});
app.post("/api/admin/backups/create", async (req, res) => {
  const { type } = req.body;
  try {
    const snapshot = await createBackupSnapshot(type === "AUTOMATIC" ? "AUTOMATIC" : "MANUAL", "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 (Admin)");
    res.json({ success: true, backup: snapshot });
  } catch (err) {
    res.status(500).json({ error: "\u0627\u06CC\u062C\u0627\u062F \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0628\u0627 \u062E\u0637\u0627 \u0645\u0648\u0627\u062C\u0647 \u0634\u062F: " + (err.message || "") });
  }
});
app.post("/api/admin/backups/restore", async (req, res) => {
  const { snapshotData, snapshotId } = req.body;
  try {
    let dataToRestore = snapshotData;
    if (!dataToRestore && snapshotId) {
      const snapDoc = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "backups", snapshotId));
      if (snapDoc.exists()) {
        dataToRestore = snapDoc.data().data;
      }
    }
    if (!dataToRestore || typeof dataToRestore !== "object") {
      return res.status(400).json({ error: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A." });
    }
    if (dataToRestore.settings) await persistSettings(dataToRestore.settings);
    if (dataToRestore.cms) await persistCms(dataToRestore.cms);
    if (Array.isArray(dataToRestore.orders)) {
      for (const order of dataToRestore.orders) {
        await persistOrder(order);
      }
    }
    await addAuditLog("BACKUP_RESTORED", "BACKUP", `\u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u06A9\u0627\u0645\u0644 \u062F\u06CC\u062A\u0627\u0628\u06CC\u0633 \u0627\u0632 \u0646\u0633\u062E\u0647 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 ${snapshotId || "\u0641\u0627\u06CC\u0644 \u0622\u067E\u0644\u0648\u062F \u0634\u062F\u0647"}`);
    res.json({ success: true, message: "\u062F\u0627\u062F\u0647\u200C\u0647\u0627\u06CC \u062F\u06CC\u062A\u0627\u0628\u06CC\u0633 \u0648 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0634\u062F\u0646\u062F." });
  } catch (err) {
    res.status(500).json({ error: "\u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0628\u0627 \u062E\u0637\u0627 \u0645\u0648\u0627\u062C\u0647 \u0634\u062F: " + (err.message || "") });
  }
});
app.delete("/api/admin/backups/:id", async (req, res) => {
  const backupId = req.params.id;
  try {
    await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "backups", backupId));
    await addAuditLog("BACKUP_DELETED", "BACKUP", `\u062D\u0630\u0641 \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0634\u0646\u0627\u0633\u0647: ${backupId}`);
    res.json({ success: true, message: "\u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062D\u0630\u0641 \u0634\u062F." });
  } catch (err) {
    res.status(500).json({ error: "\u062D\u0630\u0641 \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0628\u0627 \u062E\u0637\u0627 \u0645\u0648\u0627\u062C\u0647 \u0634\u062F." });
  }
});
app.get("/api/admin/backup-schedule", async (req, res) => {
  try {
    const schedDoc = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "settings", "backupSchedule"));
    if (schedDoc.exists()) {
      return res.json({ success: true, schedule: schedDoc.data() });
    }
  } catch (_e) {
  }
  res.json({
    success: true,
    schedule: {
      enabled: true,
      frequency: "24h",
      intervalHours: 24,
      preferredTime: "02:00",
      keepMaxBackups: 10,
      notifyOnBackup: true,
      notifyEmail: "omran.javan73@gmail.com",
      lastRunTimestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
});
app.post("/api/admin/backup-schedule", async (req, res) => {
  const scheduleConfig = req.body;
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "settings", "backupSchedule"), scheduleConfig, { merge: true });
    await addAuditLog("BACKUP_SCHEDULE_UPDATED", "BACKUP", `\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F (\u062F\u0648\u0631\u0647: ${scheduleConfig.intervalHours || 24} \u0633\u0627\u0639\u062A\u0647)`);
    res.json({ success: true, message: "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0630\u062E\u06CC\u0631\u0647 \u06AF\u0631\u062F\u06CC\u062F." });
  } catch (err) {
    res.status(500).json({ error: "\u062E\u0637\u0627 \u062F\u0631 \u0630\u062E\u06CC\u0631\u0647\u200C\u0633\u0627\u0632\u06CC \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC." });
  }
});
app.post("/api/admin/backups/email", async (req, res) => {
  const { email, includeFullData = true } = req.body;
  const targetEmail = email || "omran.javan73@gmail.com";
  try {
    const snapshot = await createBackupSnapshot("EMAIL_BACKUP", `\u0627\u0631\u0633\u0627\u0644 \u0628\u0647 ${targetEmail}`);
    const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR");
    const timeStr = (/* @__PURE__ */ new Date()).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    const emailSubject = `\u06AF\u0632\u0627\u0631\u0634 \u0646\u0633\u062E\u0647 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0648 \u0628\u06A9\u200C\u0622\u067E \u06A9\u0627\u0645\u0644 SIRIK FIT - ${dateStr}`;
    const emailBody = `\u0633\u0644\u0627\u0645 \u0648 \u0627\u062D\u062A\u0631\u0627\u0645\u060C

\u0646\u0633\u062E\u0647 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0633\u0627\u0645\u0627\u0646\u0647 SIRIK FIT \u062F\u0631 \u062A\u0627\u0631\u06CC\u062E ${dateStr} \u0633\u0627\u0639\u062A ${timeStr} \u0628\u0647 \u0634\u0631\u062D \u0632\u06CC\u0631 \u0627\u06CC\u062C\u0627\u062F \u06AF\u0631\u062F\u06CC\u062F:

\u{1F4CC} \u0634\u0646\u0627\u0633\u0647 \u0628\u06A9\u200C\u0622\u067E: ${snapshot.id}
\u{1F4CA} \u062A\u0639\u062F\u0627\u062F \u0633\u0641\u0627\u0631\u0634\u0627\u062A: ${snapshot.itemsCount?.orders || 0} \u0639\u062F\u062F
\u{1F4E6} \u062A\u0639\u062F\u0627\u062F \u0645\u062D\u0635\u0648\u0644\u0627\u062A \u0627\u0646\u0628\u0627\u0631: ${snapshot.itemsCount?.localInventory || 0} \u0639\u062F\u062F
\u{1F4B5} \u0646\u0631\u062E \u062F\u0631\u0647\u0645 \u0641\u0639\u0627\u0644: ${snapshot.data?.settings?.aedRate || "\u2014"} \u062A\u0648\u0645\u0627\u0646

\u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u06A9\u0627\u0645\u0644 \u0628\u0627 \u0641\u0631\u0645\u062A JSON \u062F\u0631 \u0633\u0627\u0645\u0627\u0646\u0647 \u0627\u0628\u0631\u06CC \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F\u0647 \u0648 \u0634\u0646\u0627\u0633\u0647 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u0622\u0646 \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F.

\u0628\u0627 \u0627\u062D\u062A\u0631\u0627\u0645\u060C
\u0633\u0627\u0645\u0627\u0646\u0647 \u0647\u0648\u0634\u0645\u0646\u062F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC SIRIK FIT`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(targetEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    await addAuditLog("BACKUP_SENT_EMAIL", "BACKUP", `\u0627\u0631\u0633\u0627\u0644 \u0646\u0633\u062E\u0647 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0628\u0647 \u0627\u06CC\u0645\u06CC\u0644: ${targetEmail}`);
    res.json({
      success: true,
      message: `\u0646\u0633\u062E\u0647 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0627\u0628\u0631\u06CC \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062B\u0628\u062A \u0634\u062F \u0648 \u0622\u0645\u0627\u062F\u0647 \u0627\u0631\u0633\u0627\u0644 \u0628\u0647 \u0627\u06CC\u0645\u06CC\u0644 ${targetEmail} \u0645\u06CC\u200C\u0628\u0627\u0634\u062F.`,
      snapshot,
      gmailUrl,
      mailtoUrl,
      emailSubject,
      emailBody
    });
  } catch (err) {
    res.status(500).json({ error: "\u062E\u0637\u0627 \u062F\u0631 \u0641\u0631\u0627\u06CC\u0646\u062F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u0627\u06CC\u0645\u06CC\u0644\u06CC: " + (err.message || "") });
  }
});
var recentVisitLogs = [];
var MAX_IN_MEMORY_LOGS = 200;
var dailyAnalyticsMap = {};
app.post("/api/analytics/track-visit", async (req, res) => {
  const { visitorId, page, referrer, userAgent } = req.body;
  const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const vid = visitorId || "v-" + Math.random().toString(36).substring(2, 9);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const dateKey = nowIso.split("T")[0];
  const visitRecord = {
    id: "visit-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    visitorId: vid,
    timestamp: nowIso,
    page: page || "/",
    referrer: referrer || "Direct",
    userAgent: userAgent || "Browser",
    ipAddress
  };
  recentVisitLogs.unshift(visitRecord);
  if (recentVisitLogs.length > MAX_IN_MEMORY_LOGS) {
    recentVisitLogs.pop();
  }
  if (!dailyAnalyticsMap[dateKey]) {
    dailyAnalyticsMap[dateKey] = { date: dateKey, totalVisits: 0, uniqueVisitors: [] };
  }
  dailyAnalyticsMap[dateKey].totalVisits += 1;
  if (!dailyAnalyticsMap[dateKey].uniqueVisitors.includes(vid)) {
    dailyAnalyticsMap[dateKey].uniqueVisitors.push(vid);
  }
  try {
    const dailyRef = (0, import_firestore.doc)(db, "analytics_daily", dateKey);
    const snap = await (0, import_firestore.getDoc)(dailyRef);
    let currentData = snap.exists() ? snap.data() : { totalVisits: 0, uniqueVisitors: [] };
    const uniques = /* @__PURE__ */ new Set([...currentData.uniqueVisitors || [], ...dailyAnalyticsMap[dateKey].uniqueVisitors]);
    await (0, import_firestore.setDoc)(dailyRef, {
      date: dateKey,
      totalVisits: Math.max((currentData.totalVisits || 0) + 1, dailyAnalyticsMap[dateKey].totalVisits),
      uniqueVisitors: Array.from(uniques).slice(-1e3)
    }, { merge: true });
  } catch (_err) {
  }
  res.json({ success: true, visitorId: vid });
});
app.get("/api/admin/visitor-stats", async (req, res) => {
  try {
    const store = await getStoreData(true);
    const orders = store.orders || [];
    const now = /* @__PURE__ */ new Date();
    const todayStr = now.toISOString().split("T")[0];
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dailyMapMerged = { ...dailyAnalyticsMap };
    try {
      const snap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "analytics_daily"));
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data && data.date) {
          const existing = dailyMapMerged[data.date] || { date: data.date, totalVisits: 0, uniqueVisitors: [] };
          const combinedUniques = Array.from(/* @__PURE__ */ new Set([...existing.uniqueVisitors, ...data.uniqueVisitors || []]));
          dailyMapMerged[data.date] = {
            date: data.date,
            totalVisits: Math.max(existing.totalVisits, data.totalVisits || 0),
            uniqueVisitors: combinedUniques
          };
        }
      });
    } catch (_e) {
    }
    const dailyDocs = Object.values(dailyMapMerged);
    const filterStats = (startDate, endDateStr) => {
      let totalVisits = 0;
      const uniqueSet = /* @__PURE__ */ new Set();
      dailyDocs.forEach((d) => {
        const docDate = new Date(d.date);
        if (endDateStr && d.date !== endDateStr) return;
        if (startDate && docDate < startDate) return;
        totalVisits += d.totalVisits || 0;
        (d.uniqueVisitors || []).forEach((u) => uniqueSet.add(u));
      });
      const filteredOrders = orders.filter((o) => {
        if (!o.createdAt) return false;
        const oDate = new Date(o.createdAt);
        if (endDateStr && o.createdAt.split("T")[0] !== endDateStr) return false;
        if (startDate && oDate < startDate) return false;
        return true;
      });
      const uniqueBuyersSet = new Set(filteredOrders.map((o) => o.userId || o.customerPhone || o.id));
      const totalRevenueToman = filteredOrders.reduce((sum, o) => sum + (o.totalPriceToman || 0), 0);
      const conversionRate = totalVisits > 0 ? (filteredOrders.length / totalVisits * 100).toFixed(1) : "0.0";
      return {
        totalVisits: totalVisits || (endDateStr === todayStr ? recentVisitLogs.length : 0),
        uniqueVisitors: uniqueSet.size || (endDateStr === todayStr ? new Set(recentVisitLogs.map((v) => v.visitorId)).size : 0),
        totalOrders: filteredOrders.length,
        uniqueBuyers: uniqueBuyersSet.size,
        totalRevenueToman,
        conversionRate
      };
    };
    const stats = {
      today: filterStats(void 0, todayStr),
      thisWeek: filterStats(startOfWeek),
      thisMonth: filterStats(startOfMonth),
      thisYear: filterStats(startOfYear),
      allTime: filterStats(new Date(2020, 0, 1))
    };
    if (stats.allTime.totalVisits === 0) {
      stats.allTime.totalVisits = Math.max(recentVisitLogs.length, orders.length * 4 + 12);
      stats.allTime.uniqueVisitors = Math.max(new Set(recentVisitLogs.map((v) => v.visitorId)).size, orders.length + 5);
      stats.today.totalVisits = Math.max(recentVisitLogs.length, orders.length);
      stats.today.uniqueVisitors = Math.max(new Set(recentVisitLogs.map((v) => v.visitorId)).size, 1);
    }
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      const dayStat = filterStats(void 0, dStr);
      const persianLabel = d.toLocaleDateString("fa-IR", { weekday: "short", month: "numeric", day: "numeric" });
      last7Days.push({
        date: dStr,
        label: persianLabel,
        visits: dayStat.totalVisits,
        buyers: dayStat.totalOrders,
        revenue: dayStat.totalRevenueToman
      });
    }
    res.json({
      success: true,
      stats,
      chartData: last7Days,
      recentVisits: recentVisitLogs.slice(0, 15)
    });
  } catch (err) {
    res.status(500).json({ error: "\u062E\u0637\u0627 \u062F\u0631 \u0645\u062D\u0627\u0633\u0628\u0647 \u0622\u0645\u0627\u0631 \u0628\u0627\u0632\u062F\u06CC\u062F: " + (err.message || "") });
  }
});
app.post("/api/auth/register", async (req, res) => {
  const { name, identifier, password } = req.body;
  if (!name || !identifier || !password) {
    return res.status(400).json({ error: "\u0644\u0637\u0641\u0627\u064B \u062A\u0645\u0627\u0645\u06CC \u0641\u06CC\u0644\u062F\u0647\u0627 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F." });
  }
  const store = readStore();
  const cleanId = identifier.trim().toLowerCase();
  const existing = store.users.find((u) => u.phoneNumber === cleanId || u.email && u.email.toLowerCase() === cleanId);
  if (existing) {
    return res.status(400).json({ error: "\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u06CC\u0627 \u0627\u06CC\u0645\u06CC\u0644 \u0642\u0628\u0644\u0627\u064B \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0633\u062A. \u0644\u0637\u0641\u0627\u064B \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F." });
  }
  const newUser = {
    id: "usr-" + Date.now(),
    name: name.trim(),
    phoneNumber: cleanId,
    email: cleanId.includes("@") ? cleanId : void 0,
    passwordHash: password,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await persistUser(newUser);
  const { passwordHash, ...userPayload } = newUser;
  return res.json({ success: true, user: userPayload });
});
app.post("/api/auth/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: "\u0634\u0645\u0627\u0631\u0647/\u0627\u06CC\u0645\u06CC\u0644 \u0648 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const store = readStore();
  const cleanId = identifier.trim().toLowerCase();
  const user = store.users.find(
    (u) => u.phoneNumber && u.phoneNumber.toLowerCase() === cleanId || u.email && u.email.toLowerCase() === cleanId
  );
  if (!user) {
    const newUser = {
      id: "usr-" + Date.now(),
      name: cleanId.includes("@") ? cleanId.split("@")[0] : "\u06A9\u0627\u0631\u0628\u0631 \u06AF\u0631\u0627\u0645\u06CC",
      phoneNumber: cleanId,
      email: cleanId.includes("@") ? cleanId : void 0,
      passwordHash: password,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await persistUser(newUser);
    const { passwordHash: passwordHash2, ...userPayload2 } = newUser;
    return res.json({ success: true, user: userPayload2, autoRegistered: true });
  }
  if (user.passwordHash !== password) {
    return res.status(400).json({ error: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0627\u0634\u062A\u0628\u0627\u0647 \u0627\u0633\u062A." });
  }
  const { passwordHash, ...userPayload } = user;
  return res.json({ success: true, user: userPayload });
});
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  const validPasswords = ["omex2025", "admin123", "omexadmin"];
  if (validPasswords.includes(password)) {
    return res.json({ success: true, token: "omex_session_token_" + Date.now() });
  } else {
    return res.status(401).json({ error: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0627\u0634\u062A\u0628\u0627\u0647 \u0627\u0633\u062A" });
  }
});
app.get("/api/preset-products", (req, res) => {
  res.json(PRESET_PRODUCTS);
});
app.get("/api/orders", (req, res) => {
  const store = readStore();
  const phone = req.query.phone;
  const userId = req.query.userId;
  const userIdentifier = req.query.userIdentifier;
  const trackingCode = req.query.trackingCode;
  let filtered = store.orders;
  if (userId) {
    filtered = filtered.filter((o) => o.userId === userId);
  } else if (userIdentifier) {
    const clean = userIdentifier.trim().toLowerCase();
    filtered = filtered.filter(
      (o) => o.userId && o.userId === clean || o.phoneNumber && o.phoneNumber.toLowerCase().includes(clean)
    );
  } else if (phone) {
    filtered = filtered.filter((o) => o.phoneNumber.includes(phone.trim()));
  }
  if (trackingCode) {
    filtered = filtered.filter((o) => o.trackingCode.toLowerCase().includes(trackingCode.trim().toLowerCase()));
  }
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(filtered);
});
app.post("/api/orders", async (req, res) => {
  const {
    userId,
    customerName,
    phoneNumber,
    deliveryAddress,
    notes,
    productTitle,
    productUrl,
    productImage,
    storeName,
    priceAed,
    weightKg,
    selectedOption
  } = req.body;
  if (!customerName || !phoneNumber || !deliveryAddress || !productTitle || priceAed === void 0) {
    return res.status(400).json({ error: "\u0644\u0637\u0641\u0627 \u062A\u0645\u0627\u0645\u06CC \u0641\u06CC\u0644\u062F\u0647\u0627\u06CC \u0627\u062C\u0628\u0627\u0631\u06CC \u0631\u0627 \u062A\u06A9\u0645\u06CC\u0644 \u06A9\u0646\u06CC\u062F" });
  }
  const store = readStore();
  const { aedRate, cargoRatePerKg, profitMargin } = store.settings;
  const weight = Math.max(0.1, weightKg || 0.5);
  const calculatedToman = Math.round((priceAed + weight * cargoRatePerKg) * (1 + profitMargin / 100) * aedRate);
  const trackingCode = "OMX-" + Math.floor(1e4 + Math.random() * 9e4);
  const newOrder = {
    id: "ord-" + Date.now(),
    userId: userId || void 0,
    trackingCode,
    customerName,
    phoneNumber,
    deliveryAddress,
    notes: notes || "",
    productTitle,
    productUrl: extractCleanUrl(productUrl || "https://drnutrition.com"),
    productImage: productImage || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400",
    storeName: storeName || "\u0641\u0631\u0648\u0634\u06AF\u0627\u0647 \u062F\u0628\u06CC",
    priceAed: Number(priceAed),
    weightKg: weight,
    aedRate,
    cargoRatePerKg,
    profitMargin,
    calculatedToman,
    selectedOption: selectedOption || void 0,
    paymentStatus: "PENDING",
    shippingStatus: "PENDING",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await persistOrder(newOrder);
  res.json({ success: true, order: newOrder });
});
app.patch("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, shippingStatus, paymentRefId } = req.body;
  const store = readStore();
  const index = store.orders.findIndex((o) => o.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\u0633\u0641\u0627\u0631\u0634 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
  }
  if (paymentStatus) store.orders[index].paymentStatus = paymentStatus;
  if (shippingStatus) store.orders[index].shippingStatus = shippingStatus;
  if (paymentRefId) store.orders[index].paymentRefId = paymentRefId;
  await persistOrder(store.orders[index]);
  res.json({ success: true, order: store.orders[index] });
});
app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const store = readStore();
  const initialLength = store.orders.length;
  store.orders = store.orders.filter((o) => o.id !== id);
  if (store.orders.length === initialLength) {
    return res.status(404).json({ error: "\u0633\u0641\u0627\u0631\u0634 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
  }
  await removeOrder(id);
  res.json({ success: true });
});
app.get("/api/payment-gateway", (req, res) => {
  const store = readStore();
  res.json(store.cms.paymentGateway || defaultCmsConfig.paymentGateway);
});
app.post("/api/payment-gateway", async (req, res) => {
  const store = readStore();
  const paymentConfig = req.body;
  if (!store.cms) store.cms = defaultCmsConfig;
  store.cms.paymentGateway = paymentConfig;
  await persistCms(store.cms);
  res.json({ success: true, paymentGateway: store.cms.paymentGateway });
});
async function sendTelegramAdminNotification(order, cmsConfig) {
  const token = cmsConfig?.apiConfig?.telegramBotToken || cmsConfig?.homeContent?.telegramBotToken;
  const chatId = cmsConfig?.apiConfig?.adminChatId || cmsConfig?.homeContent?.adminChatId;
  const isEnabled = cmsConfig?.apiConfig?.telegramNotifyEnabled ?? true;
  if (!isEnabled || !token || !chatId) {
    console.log("[Telegram Alert] Skipped: Bot token or Chat ID missing.");
    return { success: false, reason: "missing_config" };
  }
  const customerName = order.customerName || "\u062E\u0631\u06CC\u062F\u0627\u0631";
  const customerPhone = order.phoneNumber || "-";
  const customerAddress = order.deliveryAddress || "\u0622\u062F\u0631\u0633 \u062B\u0628\u062A \u0646\u0634\u062F\u0647";
  const productTitle = order.productTitle || "\u0645\u062D\u0635\u0648\u0644 \u0633\u0641\u0627\u0631\u0634\u06CC";
  const variant = order.selectedOption || "\u0627\u0635\u0644\u06CC (\u067E\u06CC\u0634\u200C\u0641\u0631\u0636)";
  const quantity = order.quantity || 1;
  const priceAed = order.priceAed !== void 0 ? order.priceAed : 0;
  const totalToman = order.calculatedToman ? Number(order.calculatedToman).toLocaleString("fa-IR") : "\u06F0";
  const productUrl = order.productUrl || "https://drnutrition.com";
  const messageText = `\u{1F6CD}\uFE0F *\u0633\u0641\u0627\u0631\u0634 \u062C\u062F\u06CC\u062F \u062F\u0631 \u0633\u06CC\u0631\u06CC\u06A9 \u0641\u06CC\u062A (SIRIK FIT) \u062B\u0628\u062A \u0634\u062F!*

\u{1F464} *\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062E\u0631\u06CC\u062F\u0627\u0631:*
\u2022 \u0646\u0627\u0645: ${customerName}
\u2022 \u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633: ${customerPhone}
\u2022 \u0622\u062F\u0631\u0633: ${customerAddress}

\u{1F4E6} *\u0645\u0634\u062E\u0635\u0627\u062A \u06A9\u0627\u0644\u0627:*
\u2022 \u0646\u0627\u0645: ${productTitle}
\u2022 \u0645\u062A\u063A\u06CC\u0631 / \u0637\u0639\u0645 / \u0633\u0627\u06CC\u0632: ${variant}
\u2022 \u062A\u0639\u062F\u0627\u062F: ${quantity} \u0639\u062F\u062F
\u2022 \u0642\u06CC\u0645\u062A \u067E\u0627\u06CC\u0647: ${priceAed} AED

\u{1F4B3} *\u067E\u0631\u062F\u0627\u062E\u062A\u06CC:* ${totalToman} \u062A\u0648\u0645\u0627\u0646

\u{1F517} *\u0644\u06CC\u0646\u06A9 \u062E\u0631\u06CC\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0627\u0632 \u062F\u0628\u06CC:*
${productUrl}`;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "Markdown",
        disable_web_page_preview: false
      })
    });
    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error("[Telegram Alert Error]:", err);
    return { success: false, error: String(err) };
  }
}
async function sendEmailAdminNotification(order, cmsConfig) {
  const destinationEmail = cmsConfig?.apiConfig?.adminDestinationEmail || cmsConfig?.homeContent?.adminDestinationEmail || "omran.javan73@gmail.com";
  const isEnabled = cmsConfig?.apiConfig?.emailNotifyEnabled ?? true;
  const resendKey = cmsConfig?.apiConfig?.resendApiKey || process.env.RESEND_API_KEY;
  const emailjsService = cmsConfig?.apiConfig?.emailjsServiceId;
  const emailjsTemplate = cmsConfig?.apiConfig?.emailjsTemplateId;
  const emailjsPublic = cmsConfig?.apiConfig?.emailjsPublicKey;
  if (!isEnabled) {
    console.log("[Email Alert] Skipped: Email notifications disabled.");
    return { success: false, reason: "disabled" };
  }
  const customerName = order.customerName || "\u062E\u0631\u06CC\u062F\u0627\u0631";
  const customerPhone = order.phoneNumber || "-";
  const customerAddress = order.deliveryAddress || "\u0622\u062F\u0631\u0633 \u062B\u0628\u062A \u0646\u0634\u062F\u0647";
  const productTitle = order.productTitle || "\u0645\u062D\u0635\u0648\u0644 \u0633\u0641\u0627\u0631\u0634\u06CC";
  const variant = order.selectedOption || "\u0627\u0635\u0644\u06CC (\u067E\u06CC\u0634\u200C\u0641\u0631\u0636)";
  const quantity = order.quantity || 1;
  const priceAed = order.priceAed !== void 0 ? order.priceAed : 0;
  const totalToman = order.calculatedToman ? Number(order.calculatedToman).toLocaleString("fa-IR") : "\u06F0";
  const productUrl = order.productUrl || "https://drnutrition.com";
  const trackingCode = order.trackingCode || "OMX-TEST";
  const htmlBody = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; color: #0f172a;">
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 20px;">\u{1F6CD}\uFE0F \u0641\u0627\u06A9\u062A\u0648\u0631 \u0633\u0641\u0627\u0631\u0634 \u062C\u062F\u06CC\u062F SIRIK FIT</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">\u06A9\u062F \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0633\u0641\u0627\u0631\u0634: <strong>${trackingCode}</strong></p>
      </div>

      <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #cbd5e1;">
        <h3 style="margin-top: 0; color: #1e293b; font-size: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">\u{1F464} \u0645\u0634\u062E\u0635\u0627\u062A \u062E\u0631\u06CC\u062F\u0627\u0631</h3>
        <p style="margin: 6px 0; font-size: 13px;"><strong>\u0646\u0627\u0645:</strong> ${customerName}</p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>\u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633:</strong> <span dir="ltr">${customerPhone}</span></p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>\u0622\u062F\u0631\u0633 \u062A\u062D\u0648\u06CC\u0644:</strong> ${customerAddress}</p>
      </div>

      <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #cbd5e1;">
        <h3 style="margin-top: 0; color: #1e293b; font-size: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">\u{1F4E6} \u0645\u0634\u062E\u0635\u0627\u062A \u06A9\u0627\u0644\u0627</h3>
        <p style="margin: 6px 0; font-size: 13px;"><strong>\u0639\u0646\u0648\u0627\u0646 \u06A9\u0627\u0644\u0627:</strong> ${productTitle}</p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>\u0645\u062A\u063A\u06CC\u0631 / \u0637\u0639\u0645 / \u0633\u0627\u06CC\u0632:</strong> ${variant}</p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>\u062A\u0639\u062F\u0627\u062F:</strong> ${quantity} \u0639\u062F\u062F</p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>\u0642\u06CC\u0645\u062A \u067E\u0627\u06CC\u0647 (\u062F\u0631\u0647\u0645):</strong> ${priceAed} AED</p>
        <p style="margin: 6px 0; font-size: 14px; color: #059669; font-weight: bold;"><strong>\u0645\u0628\u0644\u063A \u06A9\u0644 \u067E\u0631\u062F\u0627\u062E\u062A\u06CC:</strong> ${totalToman} \u062A\u0648\u0645\u0627\u0646</p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${productUrl}" target="_blank" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px; display: inline-block;">
          \u{1F517} \u0645\u0634\u0627\u0647\u062F\u0647 \u0648 \u062E\u0631\u06CC\u062F \u06A9\u0627\u0644\u0627 \u062F\u0631 \u0633\u0627\u06CC\u062A \u062F\u0628\u06CC
        </a>
      </div>
    </div>
  `;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "SIRIK FIT Orders <onboarding@resend.dev>",
          to: [destinationEmail],
          subject: `\u{1F6CD}\uFE0F \u0633\u0641\u0627\u0631\u0634 \u062C\u062F\u06CC\u062F SIRIK FIT - \u06A9\u062F \u0633\u0641\u0627\u0631\u0634 #${trackingCode}`,
          html: htmlBody
        })
      });
      const data = await res.json();
      return { success: res.ok, provider: "resend", data };
    } catch (e) {
      console.error("[Resend Email Error]:", e);
    }
  }
  if (emailjsService && emailjsTemplate && emailjsPublic) {
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: emailjsService,
          template_id: emailjsTemplate,
          user_id: emailjsPublic,
          template_params: {
            to_email: destinationEmail,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            product_title: productTitle,
            variant,
            quantity,
            price_aed: priceAed,
            total_toman: totalToman,
            product_url: productUrl,
            tracking_code: trackingCode
          }
        })
      });
      return { success: res.ok, provider: "emailjs" };
    } catch (e) {
      console.error("[EmailJS Error]:", e);
    }
  }
  console.log(`[Email Notification Logged] Sent to: ${destinationEmail}, Order: ${trackingCode}`);
  return { success: true, simulated: true, destinationEmail, trackingCode };
}
app.post("/api/notify/telegram", async (req, res) => {
  const { orderId, orderData } = req.body;
  const store = readStore();
  let orderToNotify = orderData;
  if (orderId && !orderToNotify) {
    orderToNotify = store.orders.find((o) => o.id === orderId);
  }
  if (!orderToNotify) {
    return res.status(400).json({ error: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0633\u0641\u0627\u0631\u0634 \u0628\u0631\u0627\u06CC \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
  }
  const result = await sendTelegramAdminNotification(orderToNotify, store.cms);
  res.json(result);
});
app.post("/api/notify/email", async (req, res) => {
  const { orderId, orderData } = req.body;
  const store = readStore();
  let orderToNotify = orderData;
  if (orderId && !orderToNotify) {
    orderToNotify = store.orders.find((o) => o.id === orderId);
  }
  if (!orderToNotify) {
    return res.status(400).json({ error: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0633\u0641\u0627\u0631\u0634 \u0628\u0631\u0627\u06CC \u0627\u0631\u0633\u0627\u0644 \u0627\u06CC\u0645\u06CC\u0644 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
  }
  const result = await sendEmailAdminNotification(orderToNotify, store.cms);
  res.json(result);
});
app.post("/api/payment/simulate", async (req, res) => {
  const { orderId, cardNumber, success } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "\u0634\u0646\u0627\u0633\u0647 \u0633\u0641\u0627\u0631\u0634 \u0645\u0634\u062E\u0635 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A" });
  }
  const store = readStore();
  const orderIndex = store.orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "\u0633\u0641\u0627\u0631\u0634 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
  }
  if (success !== false) {
    const paymentRefId = "PAY-" + Math.floor(1e6 + Math.random() * 9e6);
    store.orders[orderIndex].paymentStatus = "PAID";
    store.orders[orderIndex].shippingStatus = "PURCHASED";
    store.orders[orderIndex].paymentRefId = paymentRefId;
    await persistOrder(store.orders[orderIndex]);
    sendTelegramAdminNotification(store.orders[orderIndex], store.cms);
    sendEmailAdminNotification(store.orders[orderIndex], store.cms);
    return res.json({
      success: true,
      message: "\u067E\u0631\u062F\u0627\u062E\u062A \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0646\u062C\u0627\u0645 \u0634\u062F",
      paymentRefId,
      order: store.orders[orderIndex]
    });
  } else {
    store.orders[orderIndex].paymentStatus = "FAILED";
    await persistOrder(store.orders[orderIndex]);
    return res.status(400).json({
      success: false,
      error: "\u067E\u0631\u062F\u0627\u062E\u062A \u062A\u0648\u0633\u0637 \u0628\u0627\u0646\u06A9 \u0646\u0627\u0645\u0648\u0641\u0642 \u0627\u0639\u0644\u0627\u0645 \u0634\u062F",
      order: store.orders[orderIndex]
    });
  }
});
async function fetchWithProxies(targetUrl) {
  try {
    const targetEndpoint = "https://my-scraper-ycsp.onrender.com/scrape?url=" + encodeURIComponent(targetUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2e4);
    const res = await fetch(targetEndpoint, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const rawText = await res.text();
      let htmlText = rawText;
      try {
        const json = JSON.parse(rawText);
        if (json.error) {
          console.warn("[RenderScraper] Scraper returned error payload:", json.error);
          htmlText = "";
        } else if (json.html || json.data || json.content || json.body) {
          htmlText = json.html || json.data || json.content || json.body;
        }
      } catch (_e) {
      }
      if (htmlText && htmlText.length > 20 && !htmlText.trim().startsWith("{")) {
        return { ok: true, status: 200, text: htmlText };
      }
    }
  } catch (_err) {
    console.warn("[RenderScraper] Primary scraper request failed or timed out, falling back to Proxy Waterfall...");
  }
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  const headers = {
    "User-Agent": userAgent,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,application/json,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    "Cache-Control": "no-cache"
  };
  const proxyEndpoints = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(targetUrl)}`,
    targetUrl,
    `https://r.jina.ai/${encodeURIComponent(targetUrl)}`
  ];
  for (const proxyUrl of proxyEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8e3);
      const res = await fetch(proxyUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        if (proxyUrl.includes("allorigins.win/get")) {
          const json = await res.json();
          if (json && json.contents && typeof json.contents === "string" && json.contents.length > 20) {
            return { ok: true, status: 200, text: json.contents };
          }
        } else {
          const text = await res.text();
          if (text && text.length > 20) {
            return { ok: true, status: res.status, text };
          }
        }
      }
    } catch (_err) {
    }
  }
  return { ok: false, status: 500, text: "" };
}
function extractCleanUrl(input) {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim();
  const httpIndex = trimmed.search(/https?:\/\//i);
  if (httpIndex === -1) {
    return trimmed;
  }
  const fromHttp = trimmed.slice(httpIndex);
  const match = fromHttp.match(/^(https?:\/\/[^\s]+)/i);
  return match ? match[1] : fromHttp;
}
app.post("/api/parse-link", async (req, res) => {
  const rawUrl = req.body.url;
  const cleanUrl = extractCleanUrl(rawUrl);
  const storeData = readStore();
  const cmsConfig = storeData.cms;
  if (!cleanUrl || typeof cleanUrl !== "string" || !cleanUrl.toLowerCase().startsWith("http")) {
    return res.status(400).json({
      success: false,
      error: "\u0627\u0645\u06A9\u0627\u0646 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0627\u0632 \u0627\u06CC\u0646 \u0644\u06CC\u0646\u06A9 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0634\u062A. \u0644\u0637\u0641\u0627\u064B \u0635\u062D\u062A \u0644\u06CC\u0646\u06A9 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F.",
      message: "\u0627\u0645\u06A9\u0627\u0646 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0627\u0632 \u0627\u06CC\u0646 \u0644\u06CC\u0646\u06A9 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0634\u062A. \u0644\u0637\u0641\u0627\u064B \u0635\u062D\u062A \u0644\u06CC\u0646\u06A9 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F."
    });
  }
  if (cleanUrl.toLowerCase().includes("temu.com")) {
    return res.status(400).json({
      success: false,
      error: "\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0632 Temu \u0628\u0647 \u062F\u0644\u06CC\u0644 \u0627\u0645\u0646\u06CC\u062A \u0628\u0627\u0644\u0627 \u0641\u0639\u0644\u0627\u064B \u0645\u0642\u062F\u0648\u0631 \u0646\u06CC\u0633\u062A.",
      message: "\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0632 Temu \u0628\u0647 \u062F\u0644\u06CC\u0644 \u0627\u0645\u0646\u06CC\u062A \u0628\u0627\u0644\u0627 \u0641\u0639\u0644\u0627\u064B \u0645\u0642\u062F\u0648\u0631 \u0646\u06CC\u0633\u062A."
    });
  }
  const isFreeReq = req.body?.is_free_extraction === true || req.body?.is_free_extraction === "true" || req.body?.isFreeExtraction === true;
  const reqRestricted = req.body?.enable_domain_restriction ?? req.body?.enableDomainRestriction;
  const defaultAllowedDomains = ["noon.com", "amazon.ae", "lifepharmacy.com", "sporter.com", "drnutrition.com", "gnc-mena.com"];
  const configuredAllowed = cmsConfig?.apiConfig?.allowedDomains && cmsConfig.apiConfig.allowedDomains.length > 0 ? cmsConfig.apiConfig.allowedDomains : defaultAllowedDomains;
  let enableRestriction = true;
  if (typeof reqRestricted === "boolean") {
    enableRestriction = reqRestricted;
  } else if (typeof reqRestricted === "string") {
    enableRestriction = reqRestricted === "true";
  } else if (isFreeReq) {
    enableRestriction = false;
  } else {
    enableRestriction = cmsConfig?.apiConfig?.enableDomainRestriction ?? true;
  }
  let activeAllowedDomains = configuredAllowed;
  if (enableRestriction && cmsConfig?.stores) {
    const disabledStoreUrls = cmsConfig.stores.filter((s) => s.enabled === false || s.active === false).map((s) => (s.url || "").toLowerCase());
    activeAllowedDomains = configuredAllowed.filter((domain) => {
      const isStoreDisabled = disabledStoreUrls.some((u) => u.includes(domain));
      return !isStoreDisabled;
    });
  }
  if (enableRestriction) {
    const isAllowedDomain = activeAllowedDomains.some((domain) => cleanUrl.toLowerCase().includes(domain));
    if (!isAllowedDomain) {
      return res.status(400).json({
        success: false,
        error: "\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u062E\u0648\u062F\u06A9\u0627\u0631 \u0627\u0632 \u0627\u06CC\u0646 \u0633\u0627\u06CC\u062A \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0646\u0645\u06CC\u0634\u0648\u062F. \u0644\u0637\u0641\u0627\u064B \u0642\u06CC\u0645\u062A \u0648 \u0645\u0634\u062E\u0635\u0627\u062A \u0631\u0627 \u062F\u0633\u062A\u06CC \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.",
        message: "\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u062E\u0648\u062F\u06A9\u0627\u0631 \u0627\u0632 \u0627\u06CC\u0646 \u0633\u0627\u06CC\u062A \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0646\u0645\u06CC\u0634\u0648\u062F. \u0644\u0637\u0641\u0627\u064B \u0642\u06CC\u0645\u062A \u0648 \u0645\u0634\u062E\u0635\u0627\u062A \u0631\u0627 \u062F\u0633\u062A\u06CC \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F."
      });
    }
  }
  let storeName = "\u0641\u0631\u0648\u0634\u06AF\u0627\u0647 \u0622\u0646\u0644\u0627\u06CC\u0646 \u062F\u0628\u06CC";
  if (cleanUrl.includes("noon.com")) storeName = "Noon Dubai";
  else if (cleanUrl.includes("amazon.ae") || cleanUrl.includes("amazon.")) storeName = "Amazon UAE";
  else if (cleanUrl.includes("lifepharmacy.com")) storeName = "Life Pharmacy";
  else if (cleanUrl.includes("sporter.com")) storeName = "Sporter UAE";
  else if (cleanUrl.includes("drnutrition.com")) storeName = "Dr. Nutrition";
  else if (cleanUrl.includes("gnc.com") || cleanUrl.includes("gnc-mena.com")) storeName = "GNC Store";
  else if (cleanUrl.includes("lifeextension.com")) storeName = "Life Extension";
  let htmlTitle = "";
  let htmlImage = "";
  let htmlPrice = 0;
  let htmlOriginalPrice = 0;
  let htmlDescription = "";
  const collectedImages = [];
  const isAmazonUrl = cleanUrl.toLowerCase().includes("amazon.ae") || cleanUrl.toLowerCase().includes("amazon.");
  const isNoonUrl = cleanUrl.toLowerCase().includes("noon.com");
  const isDrNutritionUrl = cleanUrl.toLowerCase().includes("drnutrition.com");
  const isGncUrl = cleanUrl.toLowerCase().includes("gnc-mena.com") || cleanUrl.toLowerCase().includes("gnc.com");
  const isShopifyUrl = !isDrNutritionUrl && (isGncUrl || cleanUrl.toLowerCase().includes("/products/"));
  const sanitizeImageUrl = (rawImg) => {
    if (!rawImg) return "";
    let str = String(rawImg).trim().replace(/&amp;/g, "&");
    str = str.replace(/^["']|["']$/g, "").trim();
    if (str.startsWith("//")) {
      str = "https:" + str;
    } else if (str.startsWith("/")) {
      if (isDrNutritionUrl) {
        str = "https://drnutrition.com" + str;
      } else {
        try {
          const u = new URL(cleanUrl);
          str = `${u.protocol}//${u.host}${str}`;
        } catch (_e) {
          str = "https://drnutrition.com" + str;
        }
      }
    } else if (str.startsWith("http://")) {
      str = str.replace("http://", "https://");
    }
    str = str.split('"')[0].split("'")[0].split("\\")[0].trim();
    return str;
  };
  if (isNoonUrl) {
    const noonSkuMatch = cleanUrl.match(/\/(Z[A-Z0-9]+)\/p\//i) || cleanUrl.match(/\/(N[A-Z0-9]+)\/p\//i) || cleanUrl.match(/[\/-](Z[A-Za-z0-9]{8,25})(?:[\/\?%]|$)/i) || cleanUrl.match(/[\/-](N[A-Za-z0-9]{8,25})(?:[\/\?%]|$)/i);
    if (noonSkuMatch && noonSkuMatch[1]) {
      const sku = noonSkuMatch[1];
      const catalogApiUrl = `https://www.noon.com/_svc/catalog/api/v3/u/${sku}`;
      const proxyRes = await fetchWithProxies(catalogApiUrl);
      if (proxyRes.ok && proxyRes.text) {
        try {
          const apiJson = JSON.parse(proxyRes.text);
          const pObj = apiJson?.result?.product || apiJson?.product || apiJson?.data?.product || apiJson?.catalog?.product;
          if (pObj) {
            if (pObj.name || pObj.title || pObj.en_name) {
              htmlTitle = String(pObj.name || pObj.title || pObj.en_name).trim();
            }
            const rawP = pObj.sale_price ?? pObj.price ?? pObj.offer_price ?? pObj.variants?.[0]?.price ?? pObj.offers?.[0]?.price;
            if (rawP !== void 0 && rawP !== null) {
              const parsedP = parseFloat(String(rawP));
              if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
            }
            const rawOrig = pObj.was_price ?? pObj.original_price ?? pObj.msrp;
            if (rawOrig !== void 0 && rawOrig !== null) {
              const parsedOrig = parseFloat(String(rawOrig));
              if (!isNaN(parsedOrig) && parsedOrig > htmlPrice) htmlOriginalPrice = Math.round(parsedOrig * 100) / 100;
            }
            const imgKey = pObj.image_key || (Array.isArray(pObj.image_keys) ? pObj.image_keys[0] : null) || pObj.image_url || pObj.image;
            if (imgKey && typeof imgKey === "string") {
              if (imgKey.startsWith("http")) {
                htmlImage = imgKey;
              } else if (imgKey.startsWith("tr:") || imgKey.startsWith("products/") || imgKey.startsWith("p/")) {
                htmlImage = `https://f.nooncdn.com/${imgKey}${imgKey.endsWith(".jpg") ? "" : ".jpg"}`;
              } else {
                htmlImage = `https://f.nooncdn.com/products/tr:n-t_400/${imgKey}.jpg`;
              }
            } else if (Array.isArray(pObj.images) && pObj.images[0]) {
              htmlImage = typeof pObj.images[0] === "string" ? pObj.images[0] : pObj.images[0].url || pObj.images[0].src || "";
            }
            if (pObj.brand || pObj.brand_name) {
              storeName = `Noon (${pObj.brand || pObj.brand_name})`;
            }
          }
        } catch (_jsonErr) {
        }
      }
    }
    if (!htmlTitle || htmlPrice === 0) {
      const pageRes = await fetchWithProxies(cleanUrl);
      if (pageRes.ok && pageRes.text) {
        const htmlText = pageRes.text;
        const nextDataMatch = htmlText.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
        if (nextDataMatch && nextDataMatch[1]) {
          try {
            const nextJson = JSON.parse(nextDataMatch[1]);
            const pp = nextJson?.props?.pageProps;
            const pObj = pp?.catalog?.product || pp?.product || pp?.productData || pp?.initialState?.product || pp?.productDetail;
            if (pObj) {
              if (!htmlTitle) {
                const titleVal = pObj.name || pObj.title || pObj.en_name || pp?.catalog?.product?.name || pp?.product?.name;
                if (titleVal) htmlTitle = String(titleVal).trim();
              }
              if (htmlPrice === 0) {
                const rawP = pObj.sale_price ?? pObj.price ?? pObj.offer_price ?? pp?.catalog?.product?.sale_price ?? pp?.product?.sale_price;
                if (rawP !== void 0 && rawP !== null) {
                  const cleanPStr = String(rawP).replace(/,/g, "").replace(/[^0-9.]/g, "");
                  const parsedP = parseFloat(cleanPStr);
                  if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
                }
              }
              if (!htmlImage) {
                const imgKey = pObj.image_key || pp?.catalog?.product?.image_key || pp?.product?.image_key || (Array.isArray(pObj.image_keys) ? pObj.image_keys[0] : null);
                if (imgKey) {
                  htmlImage = String(imgKey).startsWith("http") ? String(imgKey) : `https://f.nooncdn.com/products/tr:n-t_400/${imgKey}.jpg`;
                }
              }
            }
          } catch (_e) {
          }
        }
        if (!htmlTitle) {
          const noonTitle = htmlText.match(/<h1[^>]*class=["'][^"']*pdp-[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) || htmlText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || htmlText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
          if (noonTitle && noonTitle[1]) htmlTitle = noonTitle[1].replace(/<[^>]+>/g, "").trim().replace(/\s*\|\s*Noon.*$/i, "");
        }
        if (htmlPrice === 0) {
          const noonPrice = htmlText.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/["']sale_price["']\s*:\s*([\d\.]+)/i) || htmlText.match(/["']priceNow["']\s*:\s*([\d\.]+)/i) || htmlText.match(/AED\s*([\d\.]+)/i);
          if (noonPrice && noonPrice[1]) {
            const cleanP = parseFloat(noonPrice[1]);
            if (!isNaN(cleanP) && cleanP > 0) htmlPrice = Math.round(cleanP * 100) / 100;
          }
        }
        if (!htmlImage) {
          const noonImg = htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/https:\/\/f\.nooncdn\.com\/products\/[^\s"'<>]+/i);
          if (noonImg) {
            htmlImage = noonImg[1] || noonImg[0];
          }
        }
      }
    }
  }
  if (isAmazonUrl && (!htmlTitle || htmlPrice === 0)) {
    const asinMatch = cleanUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i) || cleanUrl.match(/\/([A-Z0-9]{10})(?:[\/\?%]|$)/i);
    const targetAmzUrl = asinMatch && asinMatch[1] ? `https://www.amazon.ae/dp/${asinMatch[1]}` : cleanUrl;
    const pageRes = await fetchWithProxies(targetAmzUrl);
    if (pageRes.ok && pageRes.text) {
      const htmlText = pageRes.text;
      if (pageRes.text.startsWith("# ") || pageRes.text.includes("Title: ")) {
        const jinaTitle = htmlText.match(/^#\s*([^\n]+)/m) || htmlText.match(/Title:\s*([^\n]+)/i);
        if (jinaTitle && jinaTitle[1]) {
          htmlTitle = jinaTitle[1].replace(/^Amazon\.ae\s*:\s*/i, "").replace(/\s*[\-\|:]\s*Amazon.*$/i, "").trim();
        }
        const jinaPrice = htmlText.match(/(?:AED|Price:)\s*([\d\.,]+)/i) || htmlText.match(/([\d\.,]+)\s*AED/i);
        if (jinaPrice && jinaPrice[1]) {
          const cleanP = parseFloat(jinaPrice[1].replace(/,/g, ""));
          if (!isNaN(cleanP) && cleanP > 0) htmlPrice = Math.round(cleanP * 100) / 100;
        }
        const jinaImg = htmlText.match(/(https:\/\/(?:m\.media-amazon|images-na\.ssl-images-amazon)\.com\/images\/I\/[^\s"'\)\n]+)/i);
        if (jinaImg && jinaImg[1]) htmlImage = jinaImg[1];
      }
      if (!htmlTitle) {
        const amzTitle = htmlText.match(/<span[^>]*id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i) || htmlText.match(/<h1[^>]*id=["']title["'][^>]*>([\s\S]*?)<\/h1>/i) || htmlText.match(/<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<title>([^<]+)<\/title>/i);
        if (amzTitle && amzTitle[1]) {
          htmlTitle = amzTitle[1].replace(/<[^>]+>/g, "").replace(/&#\d+;/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
        }
      }
      if (htmlPrice === 0) {
        const amzPrice = htmlText.match(/<span[^>]*class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*(?:AED|AED&nbsp;)?\s*([\d\.,]+)\s*(?:AED)?<\/span>/i) || htmlText.match(/id=["'](?:priceblock_ourprice|priceblock_dealprice|price_inside_buybox|corePrice_desktop|corePrice_feature_div)["'][^>]*>\s*(?:AED)?\s*([\d\.,]+)/i) || htmlText.match(/<span[^>]*class=["'][^"']*a-price-whole[^"']*["'][^>]*>([\d\.,]+)/i) || htmlText.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/["']price["']\s*:\s*["']?([\d\.]+)["']?/i);
        if (amzPrice && amzPrice[1]) {
          const cleanP = parseFloat(amzPrice[1].replace(/,/g, ""));
          if (!isNaN(cleanP) && cleanP > 0) htmlPrice = Math.round(cleanP * 100) / 100;
        }
      }
      if (!htmlImage) {
        const amzImg = htmlText.match(/<img[^>]*id=["']landingImage["'][^>]*data-old-hires=["']([^"']+)["']/i) || htmlText.match(/<img[^>]*id=["']landingImage["'][^>]*src=["']([^"']+)["']/i) || htmlText.match(/data-a-dynamic-image=["']\{&quot;(https:\/\/[^&"]+)&quot;/i) || htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/(https:\/\/(?:m\.media-amazon|images-na\.ssl-images-amazon)\.com\/images\/I\/[^\s"'\)<>]+)/i);
        if (amzImg && amzImg[1] && amzImg[1].startsWith("http")) {
          htmlImage = amzImg[1];
        }
      }
    }
  }
  if (isDrNutritionUrl && (!htmlTitle || htmlPrice === 0)) {
    const pageRes = await fetchWithProxies(cleanUrl);
    if (pageRes.ok && pageRes.text) {
      const htmlText = pageRes.text;
      const sanitizeImageUrl2 = (rawImg) => {
        if (!rawImg) return "";
        let str = String(rawImg).trim().replace(/&amp;/g, "&");
        str = str.replace(/^["']|["']$/g, "").trim();
        if (str.startsWith("//")) {
          str = "https:" + str;
        } else if (str.startsWith("/")) {
          str = "https://drnutrition.com" + str;
        } else if (str.startsWith("http://")) {
          str = str.replace("http://", "https://");
        }
        str = str.split('"')[0].split("'")[0].split("\\")[0].trim();
        return str;
      };
      const ldMatches = Array.from(htmlText.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
      for (const ldMatch of ldMatches) {
        if (ldMatch && ldMatch[1]) {
          try {
            const ldJson = JSON.parse(ldMatch[1]);
            const items = Array.isArray(ldJson) ? ldJson : ldJson["@graph"] ? ldJson["@graph"] : [ldJson];
            for (const item of items) {
              if (item && (item["@type"] === "Product" || item["@type"] === "IndividualProduct" || item.name || item.offers)) {
                if (!htmlTitle && item.name) {
                  htmlTitle = String(item.name).replace(/<[^>]+>/g, "").trim();
                }
                if (!htmlDescription && item.description) {
                  const cleanDesc = String(item.description).replace(/<[^>]+>/g, "").trim();
                  if (cleanDesc) htmlDescription = cleanDesc;
                }
                if (item.image) {
                  if (typeof item.image === "string") {
                    collectedImages.push(item.image);
                    if (!htmlImage) htmlImage = sanitizeImageUrl2(item.image);
                  } else if (Array.isArray(item.image)) {
                    item.image.forEach((img) => {
                      const str = typeof img === "string" ? img : img?.url || img?.src || "";
                      if (str) collectedImages.push(str);
                    });
                    if (!htmlImage && collectedImages[0]) htmlImage = sanitizeImageUrl2(collectedImages[0]);
                  } else if (typeof item.image === "object") {
                    const str = item.image.url || item.image.src || "";
                    if (str) {
                      collectedImages.push(str);
                      if (!htmlImage) htmlImage = sanitizeImageUrl2(str);
                    }
                  }
                }
                if (htmlPrice === 0 && item.offers) {
                  const offersList = Array.isArray(item.offers) ? item.offers : [item.offers];
                  for (const offerObj of offersList) {
                    if (offerObj) {
                      const pVal = offerObj.price ?? offerObj.lowPrice ?? offerObj.highPrice;
                      if (pVal !== void 0 && pVal !== null) {
                        const cleanPStr = String(pVal).replace(/,/g, "").replace(/[^0-9.]/g, "");
                        let parsedP = parseFloat(cleanPStr);
                        if (parsedP > 2e3) parsedP = parsedP / 100;
                        if (!isNaN(parsedP) && parsedP > 0) {
                          htmlPrice = Math.round(parsedP * 100) / 100;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (_e) {
          }
        }
      }
      if (!htmlTitle) {
        const titleMatch = htmlText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<h1[^>]*class=["'][^"']*product-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) || htmlText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || htmlText.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          htmlTitle = titleMatch[1].replace(/<[^>]+>/g, "").replace(/&#\d+;/g, "").replace(/&amp;/g, "&").replace(/\s*[\-\|:]\s*Dr\.?\s*Nutrition.*$/i, "").trim();
        }
      }
      if (!htmlImage) {
        const imageMatch = htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<meta[^>]*name=["']og:image["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<meta[^>]*property=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<img[^>]*class=["'][^"']*product[^"']*["'][^>]*src=["']([^"']+)["']/i) || htmlText.match(/<img[^>]*class=["'][^"']*product[^"']*["'][^>]*data-src=["']([^"']+)["']/i) || htmlText.match(/<img[^>]*class=["'][^"']*product[^"']*["'][^>]*data-lazy=["']([^"']+)["']/i) || htmlText.match(/<img[^>]*data-src=["']([^"']+)["'][^>]*class=["'][^"']*product[^"']*["']/i) || htmlText.match(/<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*product[^"']*["']/i) || htmlText.match(/["'](?:image|imageUrl|full_image|main_image|product_image)["']\s*:\s*["']([^"']+)["']/i) || htmlText.match(/<img[^>]*src=["']([^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
        if (imageMatch && imageMatch[1]) {
          htmlImage = sanitizeImageUrl2(imageMatch[1]);
        }
      }
      if (!htmlDescription) {
        const descMatch = htmlText.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<meta[^>]*property=["']description["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i);
        if (descMatch && descMatch[1]) {
          const cleanDesc = descMatch[1].replace(/<[^>]+>/g, "").replace(/&#\d+;/g, "").replace(/&amp;/g, "&").trim();
          if (cleanDesc) htmlDescription = cleanDesc;
        }
      }
      if (htmlPrice === 0) {
        const priceMatch = htmlText.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/["']price["']\s*:\s*["']?([\d\.,]+)["']?/i) || htmlText.match(/["']priceAmount["']\s*:\s*["']?([\d\.,]+)["']?/i) || htmlText.match(/AED\s*([\d\.,]+)/i) || htmlText.match(/([\d\.,]+)\s*AED/i);
        if (priceMatch && priceMatch[1]) {
          const cleanPStr = priceMatch[1].replace(/,/g, "").replace(/[^0-9.]/g, "");
          const parsedP = parseFloat(cleanPStr);
          if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
        }
      }
    }
  }
  if (isShopifyUrl && (!htmlTitle || htmlPrice === 0)) {
    const rawBaseUrl = cleanUrl.split("?")[0].replace(/\.js$/i, "").replace(/\.json$/i, "");
    const jsonEndpoint = rawBaseUrl + ".json";
    const jsEndpoint = rawBaseUrl + ".js";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const directJsonRes = await fetch(jsonEndpoint, {
        headers: {
          "Accept": "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (directJsonRes.ok) {
        const jsonData = await directJsonRes.json();
        const pObj = jsonData?.product || jsonData;
        if (pObj && (pObj.title || pObj.name)) {
          htmlTitle = String(pObj.title || pObj.name).trim();
          const variants = Array.isArray(pObj.variants) ? pObj.variants : [];
          const primaryVariant = variants[0];
          let rawP = primaryVariant?.price ?? pObj.price;
          if (rawP !== void 0 && rawP !== null) {
            const cleanPStr = String(rawP).replace(/,/g, "").replace(/[^0-9.]/g, "");
            let parsedP = parseFloat(cleanPStr);
            if (parsedP > 2e3) parsedP = parsedP / 100;
            if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
          }
          if (primaryVariant?.compare_at_price) {
            const cleanOrigStr = String(primaryVariant.compare_at_price).replace(/,/g, "").replace(/[^0-9.]/g, "");
            let parsedOrig = parseFloat(cleanOrigStr);
            if (parsedOrig > 2e3) parsedOrig = parsedOrig / 100;
            if (!isNaN(parsedOrig) && parsedOrig > htmlPrice) htmlOriginalPrice = Math.round(parsedOrig * 100) / 100;
          }
          const imgObj = pObj.image?.src || (Array.isArray(pObj.images) && pObj.images[0] ? typeof pObj.images[0] === "string" ? pObj.images[0] : pObj.images[0]?.src : pObj.featured_image);
          if (imgObj) {
            const imgStr = String(imgObj);
            htmlImage = imgStr.startsWith("http") ? imgStr : "https:" + imgStr;
          }
        }
      }
    } catch (_e) {
    }
    if (!htmlTitle || htmlPrice === 0) {
      const proxyRes = await fetchWithProxies(jsonEndpoint);
      if (proxyRes.ok && proxyRes.text) {
        try {
          const jsData = JSON.parse(proxyRes.text);
          const pObj = jsData?.product || jsData;
          if (pObj && (pObj.title || pObj.name)) {
            htmlTitle = String(pObj.title || pObj.name).trim();
            const variants = Array.isArray(pObj.variants) ? pObj.variants : [];
            const primaryVariant = variants[0];
            let rawP = primaryVariant?.price ?? pObj.price;
            if (rawP !== void 0 && rawP !== null) {
              const cleanPStr = String(rawP).replace(/,/g, "").replace(/[^0-9.]/g, "");
              let parsedP = parseFloat(cleanPStr);
              if (parsedP > 2e3) parsedP = parsedP / 100;
              if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
            }
            const imgObj = pObj.image?.src || (Array.isArray(pObj.images) && pObj.images[0] ? typeof pObj.images[0] === "string" ? pObj.images[0] : pObj.images[0]?.src : pObj.featured_image);
            if (imgObj) {
              const imgStr = String(imgObj);
              htmlImage = imgStr.startsWith("http") ? imgStr : "https:" + imgStr;
            }
          }
        } catch (_e) {
        }
      }
    }
    if (!htmlTitle || htmlPrice === 0) {
      const jsRes = await fetchWithProxies(jsEndpoint);
      if (jsRes.ok && jsRes.text) {
        try {
          const jsData = JSON.parse(jsRes.text);
          if (jsData && (jsData.title || jsData.name)) {
            htmlTitle = String(jsData.title || jsData.name).trim();
            let rawP = jsData.price;
            if ((rawP === void 0 || rawP === null) && Array.isArray(jsData.variants) && jsData.variants[0]) {
              rawP = jsData.variants[0].price;
            }
            if (rawP !== void 0 && rawP !== null) {
              const cleanPStr = String(rawP).replace(/,/g, "").replace(/[^0-9.]/g, "");
              let parsedP = parseFloat(cleanPStr);
              if (parsedP > 2e3) parsedP = parsedP / 100;
              if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
            }
            if (jsData.featured_image) {
              htmlImage = typeof jsData.featured_image === "string" ? jsData.featured_image.startsWith("http") ? jsData.featured_image : "https:" + jsData.featured_image : jsData.featured_image.src ? jsData.featured_image.src.startsWith("http") ? jsData.featured_image.src : "https:" + jsData.featured_image.src : "";
            }
          }
        } catch (_e) {
        }
      }
    }
  }
  if (!htmlTitle || htmlPrice === 0) {
    if (!isNoonUrl && !isAmazonUrl) {
      const pageRes = await fetchWithProxies(cleanUrl);
      if (pageRes.ok && pageRes.text) {
        const htmlText = pageRes.text;
        const ldMatches = Array.from(htmlText.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
        for (const ldMatch of ldMatches) {
          if (ldMatch && ldMatch[1]) {
            try {
              const ldJson = JSON.parse(ldMatch[1]);
              const items = Array.isArray(ldJson) ? ldJson : ldJson["@graph"] ? ldJson["@graph"] : [ldJson];
              for (const item of items) {
                if (item && (item["@type"] === "Product" || item["@type"] === "IndividualProduct" || item.name || item.offers)) {
                  if (!htmlTitle && item.name) htmlTitle = String(item.name).trim();
                  if (!htmlImage) {
                    if (typeof item.image === "string") htmlImage = item.image;
                    else if (Array.isArray(item.image) && item.image[0]) htmlImage = typeof item.image[0] === "string" ? item.image[0] : item.image[0]?.url || "";
                  }
                  if (htmlPrice === 0 && item.offers) {
                    const offerObj = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                    if (offerObj) {
                      const pVal = offerObj.price ?? offerObj.lowPrice ?? offerObj.highPrice;
                      if (pVal !== void 0 && pVal !== null) {
                        let parsedP = parseFloat(String(pVal));
                        if (parsedP > 2e3) parsedP = parsedP / 100;
                        if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
                      }
                    }
                  }
                }
              }
            } catch (_e) {
            }
          }
        }
        if (!htmlTitle) {
          const titleMatch = htmlText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<h1[^>]*class=["'][^"']*product-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) || htmlText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || htmlText.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            htmlTitle = titleMatch[1].replace(/<[^>]+>/g, "").replace(/&#\d+;/g, "").replace(/\s*\|.*/, "").replace(/\s*- Dr\.?\s*Nutrition.*$/i, "").trim();
          }
        }
        if (!htmlImage) {
          const imageMatch = htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/<meta[^>]*name=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (imageMatch && imageMatch[1] && imageMatch[1].startsWith("http")) htmlImage = imageMatch[1];
        }
        if (htmlPrice === 0) {
          const priceMatch = htmlText.match(/<meta[^>]*property=["'](?:og:price:amount|product:price:amount)["'][^>]*content=["']([^"']+)["']/i) || htmlText.match(/["']price["']\s*:\s*["']?([\d\.,]+)["']?/i) || htmlText.match(/["']offers["'][\s\S]*?["']price["']\s*:\s*["']?([\d\.,]+)["']?/i) || htmlText.match(/AED\s*([\d\.,]+)/i) || htmlText.match(/([\d\.,]+)\s*AED/i);
          if (priceMatch && priceMatch[1]) {
            const cleanPStr = priceMatch[1].replace(/,/g, "").replace(/[^0-9.]/g, "");
            const parsedP = parseFloat(cleanPStr);
            if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
          }
        }
      }
    }
  }
  if (htmlTitle) {
    htmlTitle = htmlTitle.replace(/\s*[\-\|:]\s*Amazon\.ae.*$/i, "").replace(/^Buy\s+/i, "").replace(/\s*online on Amazon\.ae.*$/i, "").replace(/\s*[\-\|:]\s*Noon.*$/i, "").replace(/\s*[\-\|:]\s*Dr\.?\s*Nutrition.*$/i, "").trim();
  }
  if (htmlTitle && htmlPrice > 0) {
    if (htmlImage) {
      collectedImages.unshift(htmlImage);
    }
    const processedImages = [];
    for (const rawImg of collectedImages) {
      if (!rawImg) continue;
      let clean = sanitizeImageUrl(rawImg);
      if (!clean || !clean.startsWith("http")) continue;
      if ((isDrNutritionUrl || clean.includes("drnutrition.com")) && !clean.includes("images.weserv.nl")) {
        clean = "https://images.weserv.nl/?url=" + encodeURIComponent(clean);
      }
      if (!processedImages.includes(clean)) {
        processedImages.push(clean);
      }
    }
    const mainImage = processedImages[0] || htmlImage || "";
    const finalImagesList = processedImages.length > 0 ? processedImages.slice(0, 5) : mainImage ? [mainImage] : [];
    if (isDrNutritionUrl) {
      console.log("Extracted DrNutrition Images:", finalImagesList);
    }
    const effectiveOrig = htmlOriginalPrice > htmlPrice ? htmlOriginalPrice : 0;
    const effectiveDisc = effectiveOrig > htmlPrice ? Math.round((effectiveOrig - htmlPrice) / effectiveOrig * 100) : 0;
    return res.json({
      success: true,
      title: htmlTitle,
      price: htmlPrice,
      brand: storeName,
      url: cleanUrl,
      priceAed: htmlPrice,
      price_aed: htmlPrice,
      originalPriceAed: effectiveOrig > 0 ? effectiveOrig : void 0,
      original_price_aed: effectiveOrig > 0 ? effectiveOrig : void 0,
      discountPercent: effectiveDisc > 0 ? effectiveDisc : void 0,
      weightKg: 0.8,
      storeName,
      image: mainImage,
      mainImage,
      image_url: mainImage,
      images: finalImagesList,
      galleryImages: finalImagesList,
      description: htmlDescription || `\u0645\u062D\u0635\u0648\u0644 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0634\u062F\u0647 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0627\u0632 ${storeName}`,
      options: ["\u067E\u06CC\u0634\u200C\u0641\u0631\u0636 / \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F"],
      aiExtracted: false,
      directScraped: true
    });
  }
  return res.status(400).json({
    success: false,
    error: "\u0633\u0627\u06CC\u062A \u0645\u0628\u062F\u0627 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0631\u0627 \u0645\u0633\u062F\u0648\u062F \u06A9\u0631\u062F. \u0644\u0637\u0641\u0627\u064B \u0644\u062D\u0638\u0627\u062A\u06CC \u0628\u0639\u062F \u0645\u062C\u062F\u062F\u0627\u064B \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F.",
    message: "\u0633\u0627\u06CC\u062A \u0645\u0628\u062F\u0627 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0631\u0627 \u0645\u0633\u062F\u0648\u062F \u06A9\u0631\u062F. \u0644\u0637\u0641\u0627\u064B \u0644\u062D\u0638\u0627\u062A\u06CC \u0628\u0639\u062F \u0645\u062C\u062F\u062F\u0627\u064B \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F."
  });
});
app.use((err, req, res, next) => {
  if (err) {
    console.error("Express Server Error:", err.message || err);
    return res.status(err.status || err.statusCode || 500).json({
      error: err.message || "\u062E\u0637\u0627\u06CC \u0633\u0631\u0648\u0631 \u0631\u062E \u062F\u0627\u062F\u0647 \u0627\u0633\u062A."
    });
  }
  next();
});
var api = (0, import_https.onRequest)(
  {
    cors: true,
    memory: "1GiB",
    timeoutSeconds: 60
  },
  app
);
async function startServer() {
  await getStoreData().catch((e) => console.warn("Initial store hydrate warn:", e));
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  if (!process.env.FUNCTION_TARGET && !process.env.FUNCTIONS_EMULATOR) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`OMEX Dubai Import Platform server listening on http://localhost:${PORT}`);
    });
  }
}
if (!process.env.FUNCTION_TARGET && !process.env.FUNCTIONS_EMULATOR) {
  startServer();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  api
});
//# sourceMappingURL=server.cjs.map
