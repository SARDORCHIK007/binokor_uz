/** Small fetch wrapper for the cabinet panels: JSON in, JSON out, never throws. */
export async function send<T = unknown>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data: T | null = null;
    try {
      data = (await response.json()) as T;
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export const FIELD =
  "min-h-11 w-full rounded-xl border border-line-strong bg-card px-3 text-base text-navy-900 placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
