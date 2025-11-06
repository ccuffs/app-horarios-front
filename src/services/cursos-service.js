import axiosInstance from "../auth/axios.js";
import requestCacheService from "./request-cache-service.js";

/**
 * Busca todos os cursos (com cache por padrão)
 * Cursos mudam raramente, então o cache ajuda a reduzir requisições
 * @param {boolean} useCache - Se true, usa cache (padrão: true)
 * @param {boolean} forceRefresh - Se true, ignora o cache e busca do servidor
 * @param {number} cacheExpireSeconds - Tempo de expiração em segundos (padrão: 12 horas)
 * @returns {Promise} Lista de cursos
 */
export async function getCursos(
	useCache = true,
	forceRefresh = false,
	cacheExpireSeconds = 43200,
) {
	// Se não usar cache, faz requisição direta
	if (!useCache) {
		try {
			const response = await axiosInstance.get("/cursos");
			return response.cursos;
		} catch (error) {
			console.error("Erro ao buscar cursos:", error);
			throw new Error(
				error.response?.data?.message ||
					error.message ||
					"Erro ao buscar cursos",
			);
		}
	}

	// Usa cache
	if (forceRefresh) {
		await requestCacheService.limparCache("cursos", true);
	}

	return await requestCacheService.cacheRequest(
		"cursos",
		async () => {
			try {
				const response = await axiosInstance.get("/cursos");
				return response.cursos;
			} catch (error) {
				console.error("Erro ao buscar cursos:", error);
				throw new Error(
					error.response?.data?.message ||
						error.message ||
						"Erro ao buscar cursos",
				);
			}
		},
		cacheExpireSeconds,
	);
}

// POST - Criar novo curso
export async function createCurso(data) {
	try {
		const response = await axiosInstance.post("/cursos/", {
			formData: data,
		});

		// Limpar cache após criar
		await requestCacheService.limparCache("cursos", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao criar curso:", error);
		throw error;
	}
}

// PUT - Atualizar curso existente
export async function updateCurso(data) {
	try {
		const response = await axiosInstance.put("/cursos/", {
			formData: data,
		});

		// Limpar cache após atualizar
		await requestCacheService.limparCache("cursos", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao atualizar curso:", error);
		throw error;
	}
}

// DELETE - Remover curso
export async function deleteCurso(id) {
	try {
		const response = await axiosInstance.delete(`/cursos/${id}`);

		// Limpar cache após deletar
		await requestCacheService.limparCache("cursos", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao deletar curso:", error);
		throw error;
	}
}

/**
 * Buscar cursos de um usuário específico (com cache por padrão)
 * @param {string} userId - ID do usuário
 * @param {boolean} useCache - Se true, usa cache (padrão: true)
 * @param {boolean} forceRefresh - Se true, ignora o cache e busca do servidor
 * @param {number} cacheExpireSeconds - Tempo de expiração em segundos (padrão: 1 hora)
 * @returns {Promise} Lista de cursos do usuário
 */
export async function getCursosByUsuario(
	userId,
	useCache = true,
	forceRefresh = false,
	cacheExpireSeconds = 3600,
) {
	// Se não usar cache, faz requisição direta
	if (!useCache) {
		try {
			const response = await axiosInstance.get(`/usuarios/${userId}/cursos`);
			return response.cursos || [];
		} catch (error) {
			console.error("Erro ao buscar cursos do usuário:", error);
			throw new Error(
				error.response?.data?.message ||
					error.message ||
					"Erro ao buscar cursos do usuário",
			);
		}
	}

	// Usa cache
	const cacheKey = `cursos_usuario_${userId}`;

	if (forceRefresh) {
		await requestCacheService.limparCache(cacheKey, true);
	}

	return await requestCacheService.cacheRequest(
		cacheKey,
		async () => {
			try {
				const response = await axiosInstance.get(`/usuarios/${userId}/cursos`);
				return response.cursos || [];
			} catch (error) {
				console.error("Erro ao buscar cursos do usuário:", error);
				throw new Error(
					error.response?.data?.message ||
						error.message ||
						"Erro ao buscar cursos do usuário",
				);
			}
		},
		cacheExpireSeconds,
	);
}

/**
 * Limpa o cache de cursos
 * Útil quando cursos são modificados
 */
export async function limparCacheCursos() {
	await requestCacheService.limparCache("cursos", true);
}

// Exportação padrão para manter compatibilidade
const cursosService = {
	getCursos,
	createCurso,
	updateCurso,
	deleteCurso,
	getCursosByUsuario,
	limparCacheCursos,
};

export default cursosService;
