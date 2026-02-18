import type { ApiErrorResponse } from "./types";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "/api/v1";
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = "ApiError";
  }
}

type RequestOptions = RequestInit & {
  token?: string;
  params?: Record<string, string | number | boolean | undefined>;
  // biome-ignore lint/suspicious/noExplicitAny: Body can be any JSON-serializable value
  body?: any;
  timeout?: number;
};

function buildUrl(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const isAbsolute = baseUrl.startsWith("http://") || baseUrl.startsWith("https://");
  const fullUrl = isAbsolute ? `${baseUrl}${endpoint}` : `http://dummy.com${baseUrl}${endpoint}`;
  const url = new URL(fullUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
  }
  return isAbsolute ? url.toString() : url.pathname + url.search;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!response.ok) {
    let detail = "An error occurred";
    if (isJson) {
      const errorData = (await response.json()) as ApiErrorResponse;
      detail = errorData.error?.detail || errorData.error?.message || detail;
    } else {
      detail = await response.text();
    }
    throw new ApiError(response.status, detail);
  }

  if (isJson) {
    return (await response.json()) as T;
  }

  throw new Error(`Unexpected response content-type: ${contentType}`);
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, params, body, timeout, ...init } = options;

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  let processedBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData || typeof body === "string") {
      processedBody = body;
    } else {
      processedBody = JSON.stringify(body);
    }
  }
  let abortController: AbortController | undefined;
  let timeoutId: NodeJS.Timeout | undefined;
  if (timeout !== undefined) {
    abortController = new AbortController();
    timeoutId = setTimeout(() => {
      abortController?.abort();
    }, timeout);
  }
  try {
    const url = buildUrl(getBaseUrl(), endpoint, params);
    const response = await fetch(url, {
      ...init,
      headers,
      body: processedBody,
      signal: abortController?.signal,
    });
    return await handleResponse<T>(response);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export async function apiUpload<T>(
  endpoint: string,
  file: File,
  token?: string,
  timeout?: number,
): Promise<T> {
  const supportedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!supportedMimeTypes.includes(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Supported types: ${supportedMimeTypes.join(", ")}`,
    );
  }
  const formData = new FormData();
  formData.append("file", file);
  return apiClient<T>(endpoint, {
    method: "POST",
    body: formData,
    token,
    timeout,
  });
}
