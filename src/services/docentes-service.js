import axiosInstance from "../auth/axios.js";
import requestCacheService from "./request-cache-service.js";

/**
 * Busca todos os docentes (com cache por padrão)
 * Docentes mudam raramente, então o cache ajuda a reduzir requisições
 * @param {boolean} useCache - Se true, usa cache (padrão: true)
 * @param {boolean} forceRefresh - Se true, ignora o cache e busca do servidor
 * @param {number} cacheExpireSeconds - Tempo de expiração em segundos (padrão: 12 horas)
 * @returns {Promise} Lista de docentes
 */
export async function getDocentes(
	useCache = true,
	forceRefresh = false,
	cacheExpireSeconds = 43200,
) {
	// Se não usar cache, faz requisição direta
	if (!useCache) {
		try {
			const response = await axiosInstance.get("/docentes");
			return response.docentes;
		} catch (error) {
			console.error("Erro ao buscar docentes:", error);
			throw new Error(
				error.response?.data?.message ||
					error.message ||
					"Erro ao buscar docentes",
			);
		}
	}

	// Usa cache
	if (forceRefresh) {
		await requestCacheService.limparCache("docentes", true);
	}

	return await requestCacheService.cacheRequest(
		"docentes",
		async () => {
			try {
				const response = await axiosInstance.get("/docentes");
				return response.docentes;
			} catch (error) {
				console.error("Erro ao buscar docentes:", error);
				throw new Error(
					error.response?.data?.message ||
						error.message ||
						"Erro ao buscar docentes",
				);
			}
		},
		cacheExpireSeconds,
	);
}

// POST - Criar novo docente
export async function createDocente(data) {
	try {
		const response = await axiosInstance.post("/docentes", {
			formData: data,
		});

		// Limpar cache após criar
		await requestCacheService.limparCache("docentes", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao criar docente:", error);
		throw error;
	}
}

// PUT - Atualizar docente existente
export async function updateDocente(data) {
	try {
		const response = await axiosInstance.put("/docentes/", {
			formData: data,
		});

		// Limpar cache após atualizar
		await requestCacheService.limparCache("docentes", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao atualizar docente:", error);
		throw error;
	}
}

// DELETE - Remover docente
export async function deleteDocente(codigo) {
	try {
		const response = await axiosInstance.delete(`/docentes/${codigo}`);

		// Limpar cache após deletar
		await requestCacheService.limparCache("docentes", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao deletar docente:", error);
		throw error;
	}
}

/**
 * Limpa o cache de docentes
 * Útil quando docentes são modificados
 */
export async function limparCacheDocentes() {
	await requestCacheService.limparCache("docentes", true);
}

// Exportação padrão para manter compatibilidade
const docentesService = {
	getDocentes,
	createDocente,
	updateDocente,
	deleteDocente,
	limparCacheDocentes,
};

export default docentesService;
