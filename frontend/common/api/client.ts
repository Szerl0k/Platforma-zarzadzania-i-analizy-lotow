import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
const csrfHeaderName = "x-csrf-token";
const csrfSafeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

const csrfClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

interface CsrfTokenResponse {
  csrfToken: string;
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _csrfRetry?: boolean;
}

let csrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function requiresCsrf(config: InternalAxiosRequestConfig): boolean {
  const method = config.method?.toUpperCase() ?? "GET";
  return !csrfSafeMethods.has(method);
}

function setCsrfHeader(
  config: InternalAxiosRequestConfig,
  token: string,
): void {
  config.headers = AxiosHeaders.from(config.headers);
  config.headers.set(csrfHeaderName, token);
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  csrfTokenRequest ??= csrfClient
    .get<CsrfTokenResponse>("/csrf-token")
    .then(({ data }) => {
      csrfToken = data.csrfToken;
      return data.csrfToken;
    })
    .finally(() => {
      csrfTokenRequest = null;
    });

  return csrfTokenRequest;
}

function invalidateCsrfToken(): void {
  csrfToken = null;
}

function changesAuthSession(url?: string): boolean {
  return (
    !!url &&
    ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some(
      (path) => url.includes(path),
    )
  );
}

function isInvalidCsrfError(error: AxiosError): boolean {
  return (
    error.response?.status === 403 &&
    (error.response.data as { error?: unknown } | undefined)?.error ===
      "invalid csrf token"
  );
}

function processQueue(error: unknown): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
}

apiClient.interceptors.request.use(async (config) => {
  if (!requiresCsrf(config)) return config;

  const token = await getCsrfToken();
  setCsrfHeader(config, token);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (changesAuthSession(response.config.url)) {
      invalidateCsrfToken();
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (isInvalidCsrfError(error) && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      invalidateCsrfToken();
      return apiClient(originalRequest);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(apiClient(originalRequest)),
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        invalidateCsrfToken();
        await apiClient.post("/auth/refresh");
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        const isAuthProbe = originalRequest.url?.includes("/users/me");
        if (
          !isAuthProbe &&
          typeof window !== "undefined" &&
          !["/login", "/register"].includes(window.location.pathname)
        ) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
