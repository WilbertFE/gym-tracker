export type ApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Browser helper for calling the app's own API routes. Never throws.
 * Plain objects are sent as JSON. A FormData body is sent as multipart, and the
 * browser sets the content type and boundary itself.
 */
export async function apiRequest<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json.error ?? "Something went wrong" };
    }
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, error: "Network error. Try again." };
  }
}
