const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '요청에 실패했습니다.');
  }

  return data;
}

export const api = {
  post: (path, body) => request('POST', path, body),
  get: (path) => request('GET', path),
  delete: (path) => request('DELETE', path),
};
