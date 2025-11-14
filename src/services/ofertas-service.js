import axiosInstance from "../auth/axios.js";
import requestCacheService from "./request-cache-service.js";

/**
 * Busca todas as ofertas (com cache por padrão)
 * @param {Object} params - Parâmetros de filtro para a busca
 * @param {boolean} useCache - Se true, usa cache (padrão: true)
 * @param {boolean} forceRefresh - Se true, ignora o cache e busca do servidor
 * @param {number} cacheExpireSeconds - Tempo de expiração em segundos (padrão: 2 horas)
 * @returns {Promise} Lista de ofertas
 */
export async function getOfertas(
	params = {},
	useCache = true,
	forceRefresh = false,
	cacheExpireSeconds = 7200,
) {
	// Função para processar as ofertas
	const processOfertas = (ofertas) => {
		// Remove duplicatas baseadas na chave primária composta (incluindo turno)
		// IMPORTANTE: Uma mesma fase pode ter múltiplos turnos, então o turno
		// deve ser parte da chave única
		const uniqueOfertas = ofertas.filter(
			(oferta, index, self) =>
				index ===
				self.findIndex(
					(o) =>
						o.ano === oferta.ano &&
						o.semestre === oferta.semestre &&
						o.id_curso === oferta.id_curso &&
						o.fase === oferta.fase &&
						o.turno === oferta.turno, // Incluído turno na verificação
				),
		);

		// Agrupar por fase para mostrar turnos múltiplos
		const porFase = uniqueOfertas.reduce((acc, oferta) => {
			const key = `${oferta.ano}/${oferta.semestre} - Fase ${oferta.fase}`;
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(oferta.turno);
			return acc;
		}, {});

		return uniqueOfertas;
	};

	// Se não usar cache, faz requisição direta
	if (!useCache) {
		try {
			const response = await axiosInstance.get("/ofertas", { params });
			return processOfertas(response.ofertas);
		} catch (error) {
			console.error("Erro ao buscar ofertas:", error);
			throw new Error(
				error.response?.data?.message ||
					error.message ||
					"Erro ao buscar ofertas",
			);
		}
	}

	// Cria chave de cache única baseada nos parâmetros
	const paramsKey =
		Object.keys(params).length > 0 ? `_${JSON.stringify(params)}` : "";
	const cacheKey = `ofertas${paramsKey}`;

	// Usa cache
	if (forceRefresh) {
		await requestCacheService.limparCache(cacheKey, true);
	}

	return await requestCacheService.cacheRequest(
		cacheKey,
		async () => {
			try {
				const response = await axiosInstance.get("/ofertas", {
					params,
				});
				return processOfertas(response.ofertas);
			} catch (error) {
				console.error("Erro ao buscar ofertas:", error);
				throw new Error(
					error.response?.data?.message ||
						error.message ||
						"Erro ao buscar ofertas",
				);
			}
		},
		cacheExpireSeconds,
	);
}

// POST - Criar nova oferta
export async function createOferta(data) {
	try {
		const response = await axiosInstance.post("/ofertas", data);

		// Limpar cache de todas as ofertas (incluindo filtradas)
		await requestCacheService.limparCache("ofertas", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao criar oferta:", error);
		throw error;
	}
}

// PUT - Atualizar oferta existente
export async function updateOferta(
	ano,
	semestre,
	id_curso,
	fase,
	oldTurno,
	data,
) {
	try {
		const response = await axiosInstance.put(
			`/ofertas/${ano}/${semestre}/${id_curso}/${fase}/${oldTurno}`,
			data,
		);

		// Limpar cache de todas as ofertas (incluindo filtradas)
		await requestCacheService.limparCache("ofertas", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao atualizar oferta:", error);
		throw error;
	}
}

// DELETE - Remover oferta
export async function deleteOferta(ano, semestre, id_curso, fase, turno) {
	try {
		const response = await axiosInstance.delete(
			`/ofertas/${ano}/${semestre}/${id_curso}/${fase}/${turno}`,
		);

		// Limpar cache de todas as ofertas (incluindo filtradas)
		await requestCacheService.limparCache("ofertas", true);

		return response.data;
	} catch (error) {
		console.error("Erro ao deletar oferta:", error);
		throw error;
	}
}

/**
 * Limpa o cache de ofertas
 * Remove todos os caches de ofertas, incluindo os filtrados
 */
export async function limparCacheOfertas() {
	await requestCacheService.limparCache("ofertas", true);
}

// Exportação padrão para manter compatibilidade
const ofertasService = {
	getOfertas,
	createOferta,
	updateOferta,
	deleteOferta,
	limparCacheOfertas,
};

export default ofertasService;
