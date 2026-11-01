export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    let message = "Something went wrong";
    try {
      const data = await res.json();
      message = data.error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
};

export async function api<T = unknown>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST",
  payload?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: payload ? { "content-type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}
