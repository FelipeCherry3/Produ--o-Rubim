
export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
}

export function getAccessToken() {
  return localStorage.getItem("accessToken") || "";
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function parseJwt(token) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function isTokenValid(token) {
  if (!token) return false;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true; // se o back não manda exp, assume válido
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp > nowSec + 5; // 5s de folga
}

export function isAuthenticated() {
  return isTokenValid(getAccessToken());
}

export function getRefreshToken() {
    return localStorage.getItem("refreshToken") || "";
}