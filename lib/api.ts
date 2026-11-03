// Client for the Go API (server/). The API lives on its own domain
// (api.carvisio.pro), so every call is cross-origin and carries the session
// cookie with credentials: "include".

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "https://api.carvisio.pro" : "http://localhost:8080");

export type User = {
  id: string;
  email: string;
  createdAt: string;
};

// status 0 means no answer came back (offline, DNS, CORS, 15 s timeout).
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      // A hung API should end in an error, not in "Входим…" forever.
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError(0, "network error");
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  me: () => request<User>("GET", "/api/me"),
  register: (email: string, password: string) =>
    request<User>("POST", "/api/auth/register", { email, password }),
  login: (email: string, password: string) =>
    request<User>("POST", "/api/auth/login", { email, password }),
  logout: () => request<void>("POST", "/api/auth/logout"),
  forgotPassword: (email: string) => request<void>("POST", "/api/auth/password/forgot", { email }),
  resetPassword: (token: string, password: string) =>
    request<User>("POST", "/api/auth/password/reset", { token, password }),
};
