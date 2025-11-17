// src/api/axios.ts
import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, isAccessExpired } from '../auth/token';

const api = axios.create({
  baseURL:  'https://pcpbackend-production.up.railway.app',
  withCredentials: false, // JWT não usa cookie de sessão
  timeout: 30000,
});

// === Interceptor de Request: injeta Authorization ===
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// === Refresh "one-flight": evita múltiplos refresh simultâneos ===
let isRefreshing = false;
let pendingQueue: Array<(tok: string|null)=>void> = [];

function flushQueue(newToken: string|null) {
  pendingQueue.forEach((cb) => cb(newToken));
  pendingQueue = [];
}

// === Interceptor de Response: tenta refresh no 401 ===
api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error?.config;

    // se não for 401 ou já tentou refresh, só propaga
    if (error?.response?.status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    // marca para não entrar em loop
    original._retry = true;

    // Se já há refresh em andamento, aguarda
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((newToken) => {
          if (!newToken) return reject(error);
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }

    // Inicia refresh
    isRefreshing = true;
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('Sem refresh token');

      // (opcional) se access expirou, chama refresh; se não expirou, ainda assim 401 -> tenta refresh
      const { data } = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken },
        { timeout: 15000 }
      );

      const newAccess = data?.accessToken;
      if (!newAccess) throw new Error('Refresh falhou (sem accessToken)');

      // preserva o refresh token atual ao atualizar apenas o access token
      const currentRefresh = getRefreshToken();
      setTokens({ accessToken: newAccess, refreshToken: currentRefresh }); // mantém o refresh antigo
      flushQueue(newAccess);

      // repete a request original com o novo token
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (err) {
      flushQueue(null);
      clearTokens();
      // Redireciona pra login (ajuste a rota do seu app)
      if (typeof window !== 'undefined') {
        // opcional: preserve o path
        const backTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${backTo}`;
      }
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
