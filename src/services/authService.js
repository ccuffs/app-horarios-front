import axiosInstance from "../auth/axios.js";
import requestCacheService from "./request-cache-service.js";

export async function login(userId, senha) {
	try {
		const response = await axiosInstance.post("/auth/login", {
			userId,
			senha,
		});
		return response;
	} catch (error) {
		throw new Error(
			error.response?.data?.message ||
				error.message ||
				"Erro ao conectar com o servidor",
		);
	}
}

export async function logout() {
	try {
		await axiosInstance.post("/auth/logout");
	} catch (error) {
		console.error("Erro no logout:", error);
	}
}

/**
 * Busca os dados do usuário (com cache por padrão)
 * @param {boolean} useCache - Se true, usa cache (padrão: true)
 * @param {boolean} forceRefresh - Se true, ignora o cache e busca do servidor
 * @param {number} cacheExpireSeconds - Tempo de expiração do cache em segundos (padrão: 1 hora)
 * @returns {Promise} Dados do usuário incluindo permissões e grupos
 */
export async function getMe(
	useCache = true,
	forceRefresh = false,
	cacheExpireSeconds = 3600,
) {
	// Se não usar cache, faz requisição direta
	if (!useCache) {
		try {
			const response = await axiosInstance.get("/auth/me");
			return response.usuario;
		} catch (error) {
			throw new Error(
				error.response?.data?.message ||
					error.message ||
					"Erro ao conectar com o servidor",
			);
		}
	}

	// Usa cache
	const userId = localStorage.getItem("auth_token");

	if (!userId) {
		throw new Error("Usuário não autenticado");
	}

	// Se forceRefresh for true, limpa o cache antes de buscar
	if (forceRefresh) {
		await requestCacheService.limparCache("user_permissions", true);
	}

	return await requestCacheService.cacheRequest(
		"user_permissions",
		async () => {
			try {
				const response = await axiosInstance.get("/auth/me");
				return response.usuario;
			} catch (error) {
				throw new Error(
					error.response?.data?.message ||
						error.message ||
						"Erro ao conectar com o servidor",
				);
			}
		},
		cacheExpireSeconds,
	);
}

export async function refreshToken() {
	try {
		const token = localStorage.getItem("auth_token");

		if (!token) {
			throw new Error("Token não encontrado");
		}

		const response = await axiosInstance.post("/auth/refresh", { token });
		localStorage.setItem("auth_token", response.token);
		return response.token;
	} catch (error) {
		throw new Error(
			error.response?.data?.message ||
				error.message ||
				"Erro ao conectar com o servidor",
		);
	}
}

export async function validateToken() {
	try {
		const token = localStorage.getItem("auth_token");

		if (!token) {
			return false;
		}

		await axiosInstance.post("/auth/validate", {
			token,
		});
		return true;
	} catch (error) {
		return false;
	}
}

export function getToken() {
	return localStorage.getItem("auth_token");
}

export function setToken(token) {
	localStorage.setItem("auth_token", token);
}

export function removeToken() {
	localStorage.removeItem("auth_token");
}

export function isTokenExpired(token) {
	if (!token) return true;

	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		const currentTime = Date.now() / 1000;
		return payload.exp < currentTime;
	} catch (error) {
		return true;
	}
}

/**
 * Limpa o cache de permissões do usuário
 */
export async function clearPermissionsCache() {
	await requestCacheService.limparCache("user_permissions", true);
}

// Exportação padrão para manter compatibilidade com imports existentes
const authService = {
	login,
	logout,
	getMe,
	refreshToken,
	validateToken,
	getToken,
	setToken,
	removeToken,
	isTokenExpired,
	clearPermissionsCache,
};

export default authService;
