import axios from 'axios';

const api = axios.create({
  baseURL: '/',           // passa pelo proxy
  withCredentials: true,  // ESSENCIAL p/ JSESSIONID
  timeout: 20000,
});
export default api;