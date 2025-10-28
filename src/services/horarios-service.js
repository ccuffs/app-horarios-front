import axiosInstance from "../auth/axios.js";

// GET - Buscar horários com filtros opcionais
export async function getHorarios(params = {}) {
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

// POST - Sincronizar horários (novos, editados e removidos)
export async function syncHorarios(novos, editados, removidos) {
	try {
		const response = await axiosInstance.post("/horarios/sync", {
			novos,
			editados,
			removidos,
		});
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
