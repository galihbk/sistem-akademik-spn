const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function login(username, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(data.message || 'Login failed');
  }
  return res.json();
}

export async function checkToken(token) {
  const res = await fetch(`${API}/auth/check`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.ok;
}
