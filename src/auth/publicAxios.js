import axios from "axios";

const API_URL = import.meta.env.REACT_APP_API_URL || "http://localhost:3010/api";

const publicAxiosInstance = axios.create({
  baseURL: `${API_URL}/public`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Função para tratar respostas de sucesso
function onFulfilledResponse(response) {
  return response.data;
}

// Função para tratar erros de resposta
function handleResponseError(error) {
  return Promise.reject(error);
}

// Aplicar interceptors apenas para respostas (sem interceptors de request para não adicionar token)
publicAxiosInstance.interceptors.response.use(
  onFulfilledResponse,
  handleResponseError,
);

export default publicAxiosInstance;
