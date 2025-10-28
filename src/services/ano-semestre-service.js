import axiosInstance from "../auth/axios.js";

// GET - Buscar todos os anos/semestres
export async function getAnosSemestres() {
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

// PATCH - Atualizar status de publicação de um ano/semestre
export async function updatePublicacao(ano, semestre, publicado) {
	try {
		const response = await axiosInstance.patch(
			`/ano-semestre/${ano}/${semestre}/publicacao`,
			{ publicado },
		);
		return response.data;
	} catch (error) {
		console.error("Erro ao atualizar publicação:", error);
		throw error;
	}
}

// Exportação padrão para manter compatibilidade
const anoSemestreService = {
	getAnosSemestres,
	updatePublicacao,
};

export default anoSemestreService;
