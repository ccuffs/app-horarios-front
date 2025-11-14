import axiosInstance from "../auth/axios.js";
import requestCacheService from "./request-cache-service.js";

/**
 * Buscar horários com filtros opcionais (com cache de curta duração)
 * Cache de 30 segundos para evitar requests duplicadas do StrictMode
 * @param {Object} params - Parâmetros de filtro (ano, semestre, id_curso, etc)
 * @param {boolean} useCache - Se true, usa cache (padrão: true)
 * @returns {Promise} Horários e contagem
 */
export async function getHorarios(params = {}, useCache = true) {
	// Se não usar cache, faz requisição direta
	if (!useCache) {
		try {
			const response = await axiosInstance.get("/horarios", { params });
			return {
				horarios: response.horarios || [],
				count: response.count || response.horarios?.length || 0,
			};
		} catch (error) {
			console.error("Erro ao buscar horários:", error);
			throw new Error(
				error.response?.data?.message ||
					error.message ||
					"Erro ao buscar horários",
			);
		}
	}

	// Cria cache key baseado nos parâmetros
	const cacheKey = `horarios_${JSON.stringify(params)}`;

	// Cache de apenas 30 segundos para horários (evita duplicatas mas permite atualizações rápidas)
	return await requestCacheService.cacheRequest(
		cacheKey,
		async () => {
			try {
				const response = await axiosInstance.get("/horarios", {
					params,
				});
				return {
					horarios: response.horarios || [],
					count: response.count || response.horarios?.length || 0,
				};
			} catch (error) {
				console.error("Erro ao buscar horários:", error);
				throw new Error(
					error.response?.data?.message ||
						error.message ||
						"Erro ao buscar horários",
				);
			}
		},
		30, // 30 segundos de cache apenas
	);
}

// POST - Sincronizar horários (novos, editados e removidos)
export async function syncHorarios(novos, editados, removidos) {
	try {
		const response = await axiosInstance.post("/horarios/sync", {
			novos,
			editados,
			removidos,
		});

		// Limpar cache de horários após sincronização
		await requestCacheService.limparCache("horarios_", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao sincronizar horários:", error);
		throw error;
	}
}

// POST - Importar horários de outro período
export async function importarHorarios(
	ano_origem,
	semestre_origem,
	ano_destino,
	semestre_destino,
	id_curso,
	incluir_docentes = false,
	incluir_ofertas = false,
) {
	try {
		const response = await axiosInstance.post("/horarios/importar", {
			ano_origem,
			semestre_origem,
			ano_destino,
			semestre_destino,
			id_curso,
			incluir_docentes,
			incluir_ofertas,
		});

		// Limpar cache de horários após importação
		await requestCacheService.limparCache("horarios_", true);

		return response.data || response;
	} catch (error) {
		console.error("Erro ao importar horários:", error);
		throw error;
	}
}

// Exportação padrão para manter compatibilidade
const horariosService = {
	getHorarios,
	syncHorarios,
	importarHorarios,
};

export default horariosService;
