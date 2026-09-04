/**
 * Navigates to target payment gateway using a native DOM anchor element
 * with explicit referrerPolicy='unsafe-url' and rel='opener'.
 * This strictly forces the browser to send 'Referer: https://sirikfit.ir'
 * to the Zibal payment gateway, preventing the empty referrer rejection.
 */
export function navigateToPaymentGateway(targetUrl: string, trackId?: string): void {
  try {
    const url = targetUrl || (trackId ? "https://gateway.zibal.ir/start/" + trackId : "");
    if (!url) {
      console.error("Invalid payment URL for navigation");
      return;
    }

    const existingLink = document.getElementById("zibal-payment-redirect-link");
    if (existingLink) existingLink.remove();

    const link = document.createElement("a");
    link.id = "zibal-payment-redirect-link";
    link.href = url;
    link.referrerPolicy = "unsafe-url";
    link.rel = "opener"; // Explicitly avoid 'noreferrer' or 'noopener'
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
  } catch (err) {
    console.error("Failed to click payment anchor link:", err);
    if (targetUrl) window.location.href = targetUrl;
  }
}
