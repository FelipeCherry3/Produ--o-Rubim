import axios from 'axios';

const baseUrl = import.meta.env.BACK_URL ?? '/'; // Em dev pode usar proxy ('/') ou setar BACK_URL

const api = axios.create({
  baseURL: baseUrl,        // usa variável de ambiente BACK_URL quando definida
  withCredentials: true,   // ESSENCIAL p/ JSESSIONID
  timeout: 20000,
});
export default api;