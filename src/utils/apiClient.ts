type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

const fetchClient = async <T = unknown>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> => {
  const { params, ...customConfig } = options;
  const headers = {
    "Content-Type": "application/json",
    ...customConfig.headers,
  };

  const config: RequestInit = {
    ...customConfig,
    headers,
  };

  if (
    config.body &&
    typeof config.body === "object" &&
    !(config.body instanceof FormData)
  ) {
    config.body = JSON.stringify(config.body);
  }

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, config);
  let data;

  try {
    data = await response.json();
  } catch (_err) {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error || response.statusText,
      response.status,
      data,
    );
  }

  return data as T;
};

export const apiClient = {
  get: <T = unknown>(
    endpoint: string,
    options?: Omit<FetchOptions, "method" | "body">,
  ) => fetchClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: Omit<FetchOptions, "method" | "body">,
  ) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body as BodyInit | null | undefined,
    }),
  put: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: Omit<FetchOptions, "method" | "body">,
  ) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body as BodyInit | null | undefined,
    }),
  patch: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: Omit<FetchOptions, "method" | "body">,
  ) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body as BodyInit | null | undefined,
    }),
  delete: <T = unknown>(
    endpoint: string,
    options?: Omit<FetchOptions, "method" | "body">,
  ) => fetchClient<T>(endpoint, { ...options, method: "DELETE" }),
};
