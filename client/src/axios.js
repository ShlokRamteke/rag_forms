import axios from "axios";

const instance = axios.create({
  baseURL: `${import.meta.env.VITE_APP_API_URL}`,
});

instance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("admin_token");
  if (token) {
    config.headers["X-Admin-Token"] = token;
  }
  return config;
});

export default instance;
