import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { sendTelegramOrderNotification } from '../notifications/telegramService';

/**
 * Cloud Function trigger that listens for new orders created in Firestore `orders/{orderId}`
 * and dispatches a structured Telegram order notification to the store manager.
 */
export const onOrderCreatedNotification = onDocumentCreated(
  {
    document: 'orders/{orderId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    maxInstances: 5
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('[orderNotificationTrigger] No data associated with the event');
      return;
    }

    const orderData = snapshot.data();
    const orderId = event.params.orderId;
    console.log(`[orderNotificationTrigger] New order received: ${orderId}`);

    try {
      const orderPayload = {
        id: orderId,
        ...orderData
      };
      const result = await sendTelegramOrderNotification(orderPayload);
      console.log(`[orderNotificationTrigger] Telegram dispatch result for order ${orderId}:`, result);
    } catch (err) {
      console.error(`[orderNotificationTrigger] Error dispatching notification for order ${orderId}:`, err);
    }
  }
);

/**
 * Trigger on order update: Dispatches telegram notification when payment status transitions to PAID.
 */
export const onOrderUpdatedNotification = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    maxInstances: 5
  },
  async (event) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.data();
    const after = change.after.data();
    const orderId = event.params.orderId;

    // Check if payment was just completed
    if (before?.paymentStatus !== 'PAID' && after?.paymentStatus === 'PAID') {
      console.log(`[orderNotificationTrigger] Order ${orderId} marked as PAID. Dispatching alert.`);
      try {
        const orderPayload = {
          id: orderId,
          ...after
        };
        await sendTelegramOrderNotification(orderPayload);
      } catch (err) {
        console.error(`[orderNotificationTrigger] Error on payment update notification for order ${orderId}:`, err);
      }
    }
  }
);
