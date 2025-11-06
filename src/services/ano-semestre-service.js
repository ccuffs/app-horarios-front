import axiosInstance from "../auth/axios.js";
import requestCacheService from "./request-cache-service.js";

/**
 * Busca todos os anos/semestres (com cache por padrão)
 * Anos/semestres mudam raramente, então o cache ajuda a reduzir requisições
 * @param {boolean} useCache - Se true, usa cache (padrão: true)
 * @param {boolean} forceRefresh - Se true, ignora o cache e busca do servidor
 * @param {number} cacheExpireSeconds - Tempo de expiração em segundos (padrão: 24 horas)
 * @returns {Promise} Lista de anos/semestres
 */
export async function getAnosSemestres(
	useCache = true,
	forceRefresh = false,
	cacheExpireSeconds = 86400,
) {
	// Se não usar cache, faz requisição direta
	if (!useCache) {
		try {
			const response = await axiosInstance.get("/ano-semestre");
			return response.anosSemestres || [];
		} catch (error) {
			console.error("Erro ao buscar anos/semestres:", error);
			throw new Error(
				error.response?.data?.message ||
					error.message ||
					"Erro ao buscar anos/semestres",
			);
		}
	}

	// Usa cache
	if (forceRefresh) {
		await requestCacheService.limparCache("anos_semestres", true);
	}

	return await requestCacheService.cacheRequest(
		"anos_semestres",
		async () => {
			try {
				const response = await axiosInstance.get("/ano-semestre");
				return response.anosSemestres || [];
			} catch (error) {
				console.error("Erro ao buscar anos/semestres:", error);
				throw new Error(
					error.response?.data?.message ||
						error.message ||
						"Erro ao buscar anos/semestres",
				);
			}
		},
		cacheExpireSeconds,
	);
}

// PATCH - Atualizar status de publicação de um ano/semestre
export async function updatePublicacao(ano, semestre, publicado) {
	try {
		const response = await axiosInstance.patch(
			`/ano-semestre/${ano}/${semestre}/publicacao`,
			{ publicado },
		);

		// Limpar cache após atualização para garantir dados atualizados
		await requestCacheService.limparCache("anos_semestres", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao atualizar publicação:", error);
		throw error;
	}
}

/**
 * Limpa o cache de anos-semestres
 * Útil quando novos períodos são cadastrados ou modificados
 */
export async function limparCacheAnosSemestres() {
	await requestCacheService.limparCache("anos_semestres", true);
}

// Exportação padrão para manter compatibilidade
const anoSemestreService = {
	getAnosSemestres,
	updatePublicacao,
	limparCacheAnosSemestres,
};

export default anoSemestreService;
