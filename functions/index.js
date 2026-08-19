// Firebase Cloud Functions for SIRIK FIT - Production Payment Infrastructure (Zibal & BitPay)
process.env.FUNCTION_TARGET = process.env.FUNCTION_TARGET || 'api';
const fs = require('fs');
const path = require('path');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');

// Initialize Firebase Admin SDK safely
try {
  admin.getApp();
} catch (error) {
  admin.initializeApp();
}

// Check custom firestore databaseId from config if present
let firestoreDb;
try {
  let dbId = '(default)';
  const configPath = path.join(__dirname, '../firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (parsed.firestoreDatabaseId && parsed.firestoreDatabaseId !== '(default)') {
      dbId = parsed.firestoreDatabaseId;
    }
  }
  firestoreDb = dbId !== '(default)' ? getFirestore(admin.app(), dbId) : getFirestore(admin.app());
} catch (_err) {
  try {
    firestoreDb = getFirestore(admin.app());
  } catch (_e) {}
}

/**
 * Helper: Fetch active gateway configurations from Firestore `settings/payment`
 * or fallback to `settings/cms` or environment variables to prevent leaking credentials to clients.
 */
async function getPaymentGatewaySettings() {
  let zibalMerchant = process.env.ZIBAL_MERCHANT || 'zibal';
  let bitpayApiKey = process.env.BITPAY_API_KEY || 'adxcv-zzadq-jal-api-key';
  let activeGateway = 'zibal';

  if (firestoreDb) {
    try {
      // 1. Check settings/payment
      const paymentSnap = await firestoreDb.collection('settings').doc('payment').get();
      if (paymentSnap.exists) {
        const data = paymentSnap.data() || {};
        if (data.zibalMerchant || (data.activeGateway === 'zibal' && data.merchantId)) {
          zibalMerchant = data.zibalMerchant || data.merchantId || zibalMerchant;
        }
        if (data.bitpayApiKey || (data.activeGateway === 'bitpay' && data.merchantId)) {
          bitpayApiKey = data.bitpayApiKey || data.merchantId || bitpayApiKey;
        }
        if (data.activeGateway) {
          activeGateway = data.activeGateway;
        }
      }

      // 2. Check settings/cms fallback
      const cmsSnap = await firestoreDb.collection('settings').doc('cms').get();
      if (cmsSnap.exists) {
        const cmsData = cmsSnap.data() || {};
        const gw = cmsData.paymentGateway || {};
        if (gw.zibalMerchant || (gw.activeGateway === 'zibal' && gw.merchantId)) {
          zibalMerchant = gw.zibalMerchant || gw.merchantId || zibalMerchant;
        }
        if (gw.bitpayApiKey || (gw.activeGateway === 'bitpay' && gw.merchantId)) {
          bitpayApiKey = gw.bitpayApiKey || gw.merchantId || bitpayApiKey;
        }
        if (gw.activeGateway && !paymentSnap.exists) {
          activeGateway = gw.activeGateway;
        }
      }
    } catch (err) {
      console.warn('Failed to load dynamic gateway settings from Firestore, using env/defaults:', err.message);
    }
  }

  return { zibalMerchant, bitpayApiKey, activeGateway };
}

/**
 * Cloud Function: createPaymentRequest
 * Unified endpoint to initiate online payment via Zibal or BitPay
 * Accepts: { amount, orderId, gateway ('zibal'|'bitpay'), mobile, phoneNumber, description, callbackUrl, customerName, deliveryAddress, productTitle, priceAed, email, name, notes }
 */
const createPaymentRequest = onRequest(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 60
  },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).send('');
    }

    try {
      const {
        amount,
        orderId,
        gateway: requestedGateway,
        mobile,
        phoneNumber,
        name,
        customerName,
        email,
        description,
        callbackUrl,
        deliveryAddress,
        productTitle,
        priceAed,
        notes
      } = req.body || {};

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          result: -2,
          message: 'مبلغ سفارش نامعتبر است (باید بیشتر از ۰ باشد).'
        });
      }

      const settings = await getPaymentGatewaySettings();
      const gateway = requestedGateway || settings.activeGateway || 'zibal';

      const numAmount = Number(amount);
      // Gateway APIs in Iran expect Rials (convert Tomans to Rials if amount < 10 billion)
      const amountInRials = numAmount < 1000000000 ? numAmount * 10 : numAmount;
      const amountInTomans = Math.round(amountInRials / 10);

      const generatedOrderId = orderId || `ord-${Date.now()}`;
      const effectiveMobile = mobile || phoneNumber || '';
      const effectiveName = name || customerName || 'کاربر سیریک فیت';
      const effectiveEmail = email || '';
      const origin = req.headers.origin || 'https://sirikfit.ir';
      const effectiveCallback = callbackUrl || `${origin}/payment/callback`;
      const effectiveDescription = description || `سفارش سیریک فیت ${generatedOrderId}`;

      // ==========================================
      // ROUTE 1: ZIBAL PAYMENT GATEWAY
      // ==========================================
      if (gateway === 'zibal') {
        const zibalPayload = {
          merchant: settings.zibalMerchant,
          amount: amountInRials,
          callbackUrl: effectiveCallback,
          description: effectiveDescription,
          orderId: generatedOrderId,
          mobile: effectiveMobile
        };

        const zibalRes = await axios.post('https://gateway.zibal.ir/v1/request', zibalPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        });

        const zibalData = zibalRes.data || {};

        if (zibalData.result === 100 && zibalData.trackId) {
          const trackId = String(zibalData.trackId);
          const paymentUrl = `https://gateway.zibal.ir/start/${trackId}`;

          if (firestoreDb) {
            try {
              const orderDocRef = firestoreDb.collection('orders').doc(generatedOrderId);
              const existingSnap = await orderDocRef.get();
              const existingData = existingSnap.exists ? existingSnap.data() : {};

              await orderDocRef.set(
                {
                  ...existingData,
                  id: generatedOrderId,
                  orderId: generatedOrderId,
                  trackingCode: existingData.trackingCode || `OMX-${Math.floor(10000 + Math.random() * 90000)}`,
                  customerName: effectiveName,
                  phoneNumber: effectiveMobile,
                  deliveryAddress: deliveryAddress || existingData.deliveryAddress || '',
                  notes: notes || existingData.notes || '',
                  productTitle: productTitle || existingData.productTitle || 'سفارش واردات دبی',
                  priceAed: priceAed || existingData.priceAed || 0,
                  calculatedToman: amountInTomans,
                  amountRial: amountInRials,
                  paymentStatus: 'PENDING',
                  shippingStatus: existingData.shippingStatus || 'PROCESSING',
                  trackId: trackId,
                  gateway: 'zibal',
                  gatewayProvider: 'zibal',
                  paymentUrl: paymentUrl,
                  updatedAt: new Date().toISOString(),
                  createdAt: existingData.createdAt || new Date().toISOString()
                },
                { merge: true }
              );
            } catch (fsErr) {
              console.warn('Firestore order write note in createPaymentRequest (zibal):', fsErr.message);
            }
          }

          return res.json({
            success: true,
            result: zibalData.result,
            paymentUrl: paymentUrl,
            trackId: trackId,
            gateway: 'zibal',
            orderId: generatedOrderId,
            message: 'شناسه پرداخت زیبال با موفقیت صادر شد'
          });
        } else {
          return res.status(400).json({
            success: false,
            result: zibalData.result,
            message: zibalData.message || 'خطا در ایجاد نشست پرداخت زیبال'
          });
        }
      }

      // ==========================================
      // ROUTE 2: BITPAY PAYMENT GATEWAY
      // ==========================================
      if (gateway === 'bitpay') {
        const formParams = new URLSearchParams();
        formParams.append('api', settings.bitpayApiKey);
        formParams.append('amount', String(amountInRials));
        formParams.append('redirect', effectiveCallback);
        formParams.append('factorId', generatedOrderId);
        formParams.append('name', effectiveName);
        formParams.append('email', effectiveEmail);
        formParams.append('description', effectiveDescription);

        const bitpayRes = await axios.post('https://bitpay.ir/payment/gateway-send', formParams.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
          responseType: 'text'
        });

        const responseText = String(bitpayRes.data || '').trim();
        const idGet = Number(responseText);

        if (!isNaN(idGet) && idGet > 0) {
          const paymentUrl = `https://bitpay.ir/payment/gateway-${idGet}-get`;

          if (firestoreDb) {
            try {
              const orderDocRef = firestoreDb.collection('orders').doc(generatedOrderId);
              const existingSnap = await orderDocRef.get();
              const existingData = existingSnap.exists ? existingSnap.data() : {};

              await orderDocRef.set(
                {
                  ...existingData,
                  id: generatedOrderId,
                  orderId: generatedOrderId,
                  trackingCode: existingData.trackingCode || `OMX-${Math.floor(10000 + Math.random() * 90000)}`,
                  customerName: effectiveName,
                  phoneNumber: effectiveMobile,
                  deliveryAddress: deliveryAddress || existingData.deliveryAddress || '',
                  notes: notes || existingData.notes || '',
                  productTitle: productTitle || existingData.productTitle || 'سفارش واردات دبی',
                  priceAed: priceAed || existingData.priceAed || 0,
                  calculatedToman: amountInTomans,
                  amountRial: amountInRials,
                  paymentStatus: 'PENDING',
                  shippingStatus: existingData.shippingStatus || 'PROCESSING',
                  trackId: String(idGet),
                  idGet: String(idGet),
                  gateway: 'bitpay',
                  gatewayProvider: 'bitpay',
                  paymentUrl: paymentUrl,
                  updatedAt: new Date().toISOString(),
                  createdAt: existingData.createdAt || new Date().toISOString()
                },
                { merge: true }
              );
            } catch (fsErr) {
              console.warn('Firestore order write note in createPaymentRequest (bitpay):', fsErr.message);
            }
          }

          return res.json({
            success: true,
            result: 1,
            paymentUrl: paymentUrl,
            trackId: String(idGet),
            id_get: String(idGet),
            gateway: 'bitpay',
            orderId: generatedOrderId,
            message: 'درگاه پرداخت بیت‌پی با موفقیت ایجاد شد'
          });
        } else {
          return res.status(400).json({
            success: false,
            result: idGet || -1,
            message: `خطا در اتصال به درگاه بیت‌پی (کد خطا: ${responseText})`
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: `درگاه پرداخت مشخص شده (${gateway}) پشتیبانی نمی‌شود.`
      });
    } catch (err) {
      console.error('functions/index.js createPaymentRequest error:', err);
      return res.status(500).json({
        success: false,
        result: -2,
        message: err instanceof Error ? err.message : 'خطای داخلی سرور در اتصال به درگاه'
      });
    }
  }
);

/**
 * Cloud Function: verifyPaymentTransaction
 * Unified endpoint to verify transactions from Zibal or BitPay callback
 * Accepts: { trackId, gateway, extraParams (e.g. trans_id for bitpay), trans_id, id_get }
 */
const verifyPaymentTransaction = onRequest(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 60
  },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).send('');
    }

    try {
      const body = req.body || {};
      const query = req.query || {};

      const trackId = body.trackId || query.trackId || body.id_get || query.id_get;
      const transId = body.extraParams?.trans_id || body.trans_id || query.trans_id || body.transId || query.transId;
      const idGet = body.extraParams?.id_get || body.id_get || query.id_get || trackId;
      let gateway = body.gateway || query.gateway;

      // Auto-detect gateway if not explicitly provided
      if (!gateway) {
        if (transId && idGet) {
          gateway = 'bitpay';
        } else {
          gateway = 'zibal';
        }
      }

      const settings = await getPaymentGatewaySettings();

      // ==========================================
      // VERIFY ROUTE 1: ZIBAL
      // ==========================================
      if (gateway === 'zibal') {
        if (!trackId) {
          return res.status(400).json({
            success: false,
            result: 203,
            message: 'کد رهگیری تراکنش (trackId) مشخص نشده است.'
          });
        }

        const zibalPayload = {
          merchant: settings.zibalMerchant,
          trackId: String(trackId)
        };

        const zibalRes = await axios.post('https://gateway.zibal.ir/v1/verify', zibalPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        });

        const zibalData = zibalRes.data || {};
        const isSuccess = zibalData.result === 100 || zibalData.result === 201;

        let matchedOrderId = null;
        let matchedOrderData = null;

        if (firestoreDb) {
          try {
            const ordersRef = firestoreDb.collection('orders');
            const querySnap = await ordersRef.where('trackId', '==', String(trackId)).limit(1).get();

            if (!querySnap.empty) {
              const doc = querySnap.docs[0];
              matchedOrderId = doc.id;
              matchedOrderData = doc.data();

              if (isSuccess) {
                const updatePayload = {
                  paymentStatus: 'PAID',
                  status: 'PAID',
                  shippingStatus: 'PURCHASED',
                  refNumber: String(zibalData.refNumber || zibalData.refId || trackId),
                  paymentRefId: String(zibalData.refNumber || zibalData.refId || trackId),
                  paidAt: zibalData.paidAt || new Date().toISOString(),
                  cardNumber: zibalData.cardNumber || '',
                  gateway: 'zibal',
                  gatewayProvider: 'zibal',
                  updatedAt: new Date().toISOString()
                };
                await doc.ref.update(updatePayload);
                matchedOrderData = { ...matchedOrderData, ...updatePayload };
              } else {
                await doc.ref.update({
                  paymentStatus: 'FAILED',
                  status: 'FAILED',
                  updatedAt: new Date().toISOString()
                });
              }
            }
          } catch (fsErr) {
            console.warn('Firestore order verification update note (zibal):', fsErr.message);
          }
        }

        if (isSuccess) {
          return res.json({
            success: true,
            verified: true,
            result: zibalData.result,
            refNumber: String(zibalData.refNumber || zibalData.refId || trackId),
            amount: zibalData.amount,
            paidAt: zibalData.paidAt || new Date().toISOString(),
            cardNumber: zibalData.cardNumber,
            orderId: matchedOrderId || zibalData.orderId,
            gateway: 'zibal',
            order: matchedOrderData,
            message: zibalData.result === 201 ? 'تراکنش قبلا تایید شده است.' : 'پرداخت با موفقیت انجام و تایید شد.'
          });
        } else {
          return res.status(400).json({
            success: false,
            verified: false,
            result: zibalData.result,
            message: zibalData.message || 'پرداخت توسط بانک تایید نگردید یا لغو شد.',
            orderId: matchedOrderId,
            gateway: 'zibal'
          });
        }
      }

      // ==========================================
      // VERIFY ROUTE 2: BITPAY
      // ==========================================
      if (gateway === 'bitpay') {
        const finalTransId = transId;
        const finalIdGet = idGet;

        if (!finalTransId || !finalIdGet) {
          return res.status(400).json({
            success: false,
            result: -2,
            message: 'پارامترهای تراکنش (trans_id و id_get) الزامی است.'
          });
        }

        const formParams = new URLSearchParams();
        formParams.append('api', settings.bitpayApiKey);
        formParams.append('trans_id', String(finalTransId));
        formParams.append('id_get', String(finalIdGet));

        const bitpayRes = await axios.post('https://bitpay.ir/payment/gateway-result-second', formParams.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
          responseType: 'text'
        });

        const responseText = String(bitpayRes.data || '').trim();
        const isSuccess = responseText === '1' || Number(responseText) === 1;

        let matchedOrderId = null;
        let matchedOrderData = null;

        if (firestoreDb) {
          try {
            const ordersRef = firestoreDb.collection('orders');
            const querySnap = await ordersRef.where('trackId', '==', String(finalIdGet)).limit(1).get();

            if (!querySnap.empty) {
              const doc = querySnap.docs[0];
              matchedOrderId = doc.id;
              matchedOrderData = doc.data();

              if (isSuccess) {
                const updatePayload = {
                  paymentStatus: 'PAID',
                  status: 'PAID',
                  shippingStatus: 'PURCHASED',
                  refNumber: String(finalTransId),
                  paymentRefId: String(finalTransId),
                  transId: String(finalTransId),
                  idGet: String(finalIdGet),
                  paidAt: new Date().toISOString(),
                  gateway: 'bitpay',
                  gatewayProvider: 'bitpay',
                  updatedAt: new Date().toISOString()
                };
                await doc.ref.update(updatePayload);
                matchedOrderData = { ...matchedOrderData, ...updatePayload };
              } else {
                await doc.ref.update({
                  paymentStatus: 'FAILED',
                  status: 'FAILED',
                  updatedAt: new Date().toISOString()
                });
              }
            }
          } catch (fsErr) {
            console.warn('Firestore order verification update note (bitpay):', fsErr.message);
          }
        }

        if (isSuccess) {
          return res.json({
            success: true,
            verified: true,
            result: 1,
            refNumber: String(finalTransId),
            transId: String(finalTransId),
            idGet: String(finalIdGet),
            paidAt: new Date().toISOString(),
            orderId: matchedOrderId,
            gateway: 'bitpay',
            order: matchedOrderData,
            message: 'پرداخت با موفقیت توسط درگاه بیت‌پی تایید شد.'
          });
        } else {
          return res.status(400).json({
            success: false,
            verified: false,
            result: Number(responseText) || -1,
            message: `تایید تراکنش بیت‌پی ناموفق بود (کد وضعیت: ${responseText})`,
            orderId: matchedOrderId,
            gateway: 'bitpay'
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: `درگاه ${gateway} معتبر نیست.`
      });
    } catch (err) {
      console.error('functions/index.js verifyPaymentTransaction error:', err);
      return res.status(500).json({
        success: false,
        result: -2,
        message: err instanceof Error ? err.message : 'خطای داخلی سرور'
      });
    }
  }
);

// Load bundled Express App from functions/dist/server.cjs safely (which does NOT call app.listen)
let expressApp = null;
try {
  const distServerPath = path.join(__dirname, 'dist', 'server.cjs');
  if (fs.existsSync(distServerPath)) {
    const serverModule = require(distServerPath);
    expressApp = serverModule.app || serverModule.default || serverModule;
  }
} catch (err) {
  console.warn('Notice: functions/dist/server.cjs loading notice:', err.message);
}

/**
 * Cloud Function: api
 * High-performance Express API handler wrapped in Firebase v2 onRequest
 */
const api = onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 60
  },
  (req, res) => {
    // Handle CORS preflight options
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      return res.status(204).send('');
    }

    if (expressApp && typeof expressApp === 'function') {
      return expressApp(req, res);
    }

    if (req.path === '/health' || req.path === '/api/health') {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    return res.status(200).json({
      service: 'SIRIK FIT Backend Cloud Functions API',
      status: 'active',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'createPaymentRequest',
        'verifyPaymentTransaction',
        'requestPayment',
        'verifyPayment',
        'requestBitpayPayment',
        'verifyBitpayPayment'
      ]
    });
  }
);

module.exports = {
  api,
  createPaymentRequest,
  verifyPaymentTransaction,
  requestPayment: createPaymentRequest,
  verifyPayment: verifyPaymentTransaction,
  requestBitpayPayment: createPaymentRequest,
  verifyBitpayPayment: verifyPaymentTransaction
};
