import axiosInstance from "../auth/axios.js";
import requestCacheService from "./request-cache-service.js";

/**
 * Busca todos os CCRs (com cache por padrão)
 * CCRs mudam raramente, então o cache ajuda a reduzir requisições
 * @param {boolean} useCache - Se true, usa cache (padrão: true)
 * @param {boolean} forceRefresh - Se true, ignora o cache e busca do servidor
 * @param {number} cacheExpireSeconds - Tempo de expiração em segundos (padrão: 12 horas)
 * @returns {Promise} Lista de CCRs
 */
export async function getCCRs(
	useCache = true,
	forceRefresh = false,
	cacheExpireSeconds = 43200,
) {
	// Se não usar cache, faz requisição direta
	if (!useCache) {
		try {
			const response = await axiosInstance.get("/ccrs");
			return response.ccrs;
		} catch (error) {
			console.error("Erro ao buscar CCRs:", error);
			throw new Error(
				error.response?.data?.message ||
					error.message ||
					"Erro ao buscar CCRs",
			);
		}
	}

	// Usa cache
	if (forceRefresh) {
		await requestCacheService.limparCache("ccrs", true);
	}

	return await requestCacheService.cacheRequest(
		"ccrs",
		async () => {
			try {
				const response = await axiosInstance.get("/ccrs");
				return response.ccrs;
			} catch (error) {
				console.error("Erro ao buscar CCRs:", error);
				throw new Error(
					error.response?.data?.message ||
						error.message ||
						"Erro ao buscar CCRs",
				);
			}
		},
		cacheExpireSeconds,
	);
}

// POST - Criar novo CCR
export async function createCCR(data, cursosSelecionados) {
	try {
		const response = await axiosInstance.post("/ccrs", {
			formData: data,
			cursosSelecionados: cursosSelecionados,
		});

		// Limpar cache após criar
		await requestCacheService.limparCache("ccrs", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao criar CCR:", error);
		throw error;
	}
}

// PUT - Atualizar CCR existente
export async function updateCCR(data, cursosSelecionados) {
	try {
		const response = await axiosInstance.put("/ccrs/", {
			formData: data,
			cursosSelecionados: cursosSelecionados,
		});

		// Limpar cache após atualizar
		await requestCacheService.limparCache("ccrs", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao atualizar CCR:", error);
		throw error;
	}
}

// DELETE - Remover CCR
export async function deleteCCR(id) {
	try {
		const response = await axiosInstance.delete(`/ccrs/${id}`);

		// Limpar cache após deletar
		await requestCacheService.limparCache("ccrs", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao deletar CCR:", error);
		throw error;
	}
}

/**
 * Limpa o cache de CCRs
 * Útil quando CCRs são modificados
 */
export async function limparCacheCCRs() {
	await requestCacheService.limparCache("ccrs", true);
}

// Exportação padrão para manter compatibilidade
const ccrsService = {
	getCCRs,
	createCCR,
	updateCCR,
	deleteCCR,
	limparCacheCCRs,
};

export default ccrsService;
