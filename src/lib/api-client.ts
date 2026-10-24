export type ApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Browser helper for calling the app's own API routes. Never throws. */
export async function apiRequest<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
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
