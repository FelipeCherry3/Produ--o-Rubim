// src/api/token.js
const ACCESS_KEY  = 'rubim.accessToken';
const REFRESH_KEY = 'rubim.refreshToken';

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken)  localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY) || null;
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || null;
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// (Opcional) checar expiração sem depender do 401:
function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}
export function isAccessExpired() {
  const t = getAccessToken();
  if (!t) return true;
  const p = decodeJwt(t);
  if (!p?.exp) return false;
  const nowSec = Math.floor(Date.now()/1000);
  return p.exp <= nowSec;
}
export function isAuthenticated() {
  const t = getAccessToken();
  return !!t && !isAccessExpired();
}