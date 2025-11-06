import axios from 'axios';
// Em dev pode usar proxy ('/') ou setar BACK_URL

const api = axios.create({
  baseURL: "https://pcpbackend-production.up.railway.app/",        // usa variável de ambiente BACK_URL quando definida
  withCredentials: true,   // ESSENCIAL p/ JSESSIONID
  timeout: 30000,
});
export default api;