import axios from "axios";
import authService from "../services/authService.js";

const API_URL = import.meta.env.REACT_APP_API_URL || "http://localhost:3010/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Função para tratar requisições de saída
function onFulfilledRequest(config) {
  const token = authService.getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

// Função para tratar erros de requisição
function handleRequestError(error) {
  return Promise.reject(error);
}

// Função para tratar respostas de sucesso
function onFulfilledResponse(response) {
  return response.data;
}

// Função para tratar erros de resposta
async function handleResponseError(error) {
  const originalRequest = error.config;

  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;

    const token = authService.getToken();

    if (token && !authService.isTokenExpired(token)) {
      try {
        const newToken = await authService.refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        authService.removeToken();
        window.location.href = "/login";
        return Promise.reject(
          new Error("Sessão expirada. Faça login novamente."),
        );
      }
    } else {
      authService.removeToken();
      window.location.href = "/login";
      return Promise.reject(
        new Error("Sessão expirada. Faça login novamente."),
      );
    }
  }

  return Promise.reject(error);
}

// Aplicar interceptors
axiosInstance.interceptors.request.use(onFulfilledRequest, handleRequestError);
axiosInstance.interceptors.response.use(
  onFulfilledResponse,
  handleResponseError,
);

export default axiosInstance;
