import { getToken } from './auth';

// Helper function to ensure API URL has protocol
function normalizeApiUrl(url) {
  if (!url) return 'http://localhost:8002';
  // If URL doesn't start with http:// or https://, add http://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`;
  }
  return url;
}

export const API = normalizeApiUrl(process.env.NEXT_PUBLIC_API || 'http://localhost:8002');

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet(path) {
  try {
    const res = await fetch(`${API}${path}`, { 
      cache: 'no-store',
      headers: getHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) {
        // Unauthorized - clear auth and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'fetch failed') {
      throw new Error(`Failed to connect to API at ${API}. Make sure the backend server is running.`);
    }
    throw error;
  }
}

export async function apiPost(path, body, skipAuth = false) {
  const headers = skipAuth ? { 'Content-Type': 'application/json' } : getHeaders();
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    if (res.status === 401 && !skipAuth) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    const errorData = await res.json().catch(() => ({ detail: 'API error' }));
    throw new Error(errorData.detail || 'API error');
  }
  return res.json();
}

export async function apiPatch(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    throw new Error('API error');
  }
  return res.json();
}

export async function apiDelete(path) {
  const res = await fetch(`${API}${path}`, { 
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    throw new Error('API error');
  }
  return res.json();
}
