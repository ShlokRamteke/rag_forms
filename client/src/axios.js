import axios from "axios";

let authTokenGetter = null;

export const setAuthTokenGetter = (getter) => {
  authTokenGetter = typeof getter === "function" ? getter : null;
};

export const getAuthToken = async () => {
  if (typeof authTokenGetter === "function") {
    try {
      return await authTokenGetter();
    } catch {
      return null;
    }
  }
  return null;
};

const instance = axios.create({
  baseURL: `${import.meta.env.VITE_APP_API_URL}`,
});

instance.interceptors.request.use(async (config) => {
  if (!authTokenGetter) {
    return config;
  }

  try {
    const token = await authTokenGetter();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Unable to resolve Clerk token:", error);
  }

  return config;
});

export default instance;
