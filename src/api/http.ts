const baseUrl = (import.meta.env.VITE_OPENUTAU_API_BASE_URL ?? 'http://localhost:5000').replace(/\/$/, '');
const apiKey = import.meta.env.VITE_OPENUTAU_API_KEY ?? '';
const apiKeyHeader = import.meta.env.VITE_OPENUTAU_API_KEY_HEADER ?? 'X-Api-Key';

export interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | null | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function buildHeaders(init?: HeadersInit, hasFormData = false) {
  const headers = new Headers(init ?? {});
  if (apiKey) {
    headers.set(apiKeyHeader, apiKey);
  }
  if (!hasFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, body, headers, ...rest } = options;
  const hasFormData = body instanceof FormData;
  const response = await fetch(buildUrl(path, query), {
    ...rest,
    body,
    headers: buildHeaders(headers, hasFormData),
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { query, body, headers, ...rest } = options;
  const hasFormData = body instanceof FormData;
  const response = await fetch(buildUrl(path, query), {
    ...rest,
    body,
    headers: buildHeaders(headers, hasFormData),
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return await response.blob();
}

async function buildError(response: Response) {
  const message = await response.text().catch(() => '');
  return new Error(message || `请求失败：${response.status} ${response.statusText}`);
}

export function toFormData(file: File, fieldName = 'file') {
  const formData = new FormData();
  formData.append(fieldName, file);
  return formData;
}

export function getApiBaseUrl() {
  return baseUrl;
}
