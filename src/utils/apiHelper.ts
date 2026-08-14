/**
 * Safe fetch wrapper that checks HTTP response status and content-type header
 * before attempting to parse JSON. Prevents SyntaxError: Unexpected token '<'...
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await res.text();
      return {
        ok: false,
        status: res.status,
        error: `پاسخ غیرمنتظره از سرور (${res.status}): HTML/ورودی نامعتبر`
      };
    }

    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data?.error || data?.message || `خطا در برقراری ارتباط (${res.status})`
      };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err?.message || 'خطا در ارتباط شبکه'
    };
  }
}
