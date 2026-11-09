// Client HTTP unique pour toute l'application.
// Cookies httpOnly => credentials: 'include'.

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.code = data?.code;
  }
}

async function request(method, url, body, opts = {}) {
  const headers = { Accept: 'application/json' };
  let payload;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}/api${url}`, {
    method,
    headers,
    body: payload,
    credentials: 'include',
    ...opts,
  });

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(data?.error || `Erreur ${res.status}`, res.status, data);
  }

  return data;
}

const qs = (params = {}) => {
  const p = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) {
      p.set(k, v === true ? '1' : v);
    }
  });

  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  get: (url, params) => request('GET', url + qs(params)),
  post: (url, body) => request('POST', url, body ?? {}),
  put: (url, body) => request('PUT', url, body ?? {}),
  del: (url) => request('DELETE', url),
};

export default api;

/** Ouvre un PDF protégé par cookie dans un nouvel onglet. */
export const openPdf = (url) =>
  window.open(`${API_BASE}/api${url}`, '_blank', 'noopener');