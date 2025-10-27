import axiosInstance from "../auth/axios.js";

// GET - Buscar todos os CCRs
export async function getCCRs() {
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

// POST - Criar novo CCR
export async function createCCR(data, cursosSelecionados) {
	try {
		const response = await axiosInstance.post("/ccrs", {
			formData: data,
			cursosSelecionados: cursosSelecionados,
		});
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
		return response.data;
	} catch (error) {
		console.error("Erro ao deletar CCR:", error);
		throw error;
	}
}

// Exportação padrão para manter compatibilidade
const ccrsService = {
	getCCRs,
	createCCR,
	updateCCR,
	deleteCCR,
};

export default ccrsService;
