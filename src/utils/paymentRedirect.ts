/**
 * Submits an HTTP GET form navigation to the target payment gateway URL.
 * Using a native DOM HTML form guarantees that the browser attaches the origin
 * (https://sirikfit.ir) as the HTTP Referer header, satisfying gateway requirements (e.g. Zibal).
 */
export function navigateToPaymentGateway(targetUrl: string, trackId?: string): void {
  try {
    const url = targetUrl || (trackId ? "https://gateway.zibal.ir/start/" + trackId : "");
    if (!url) {
      console.error("Invalid payment URL for navigation");
      return;
    }
    const existingForm = document.getElementById("zibal-payment-redirect-form");
    if (existingForm) existingForm.remove();
    const form = document.createElement("form");
    form.id = "zibal-payment-redirect-form";
    form.method = "GET";
    form.action = url;
    form.style.display = "none";
    document.body.appendChild(form);
    form.submit();
  } catch (err) {
    console.error("Failed to submit dynamic payment form:", err);
    if (targetUrl) window.location.href = targetUrl;
  }
}
