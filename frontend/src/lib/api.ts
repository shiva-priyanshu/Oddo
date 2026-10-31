const TOKEN_KEY = 'subscriptiq_session_token';

export function getSessionToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export interface ApiError {
  error: string;
  statusCode: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearSessionToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    const message = data.error || `HTTP error ${response.status}`;
    const err = new Error(message) as Error & { statusCode: number };
    err.statusCode = response.status;
    throw err;
  }

  return data as T;
}
