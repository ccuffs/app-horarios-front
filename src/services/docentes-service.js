import axiosInstance from "../auth/axios.js";

// GET - Buscar todos os docentes
export async function getDocentes() {
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

// POST - Criar novo docente
export async function createDocente(data) {
	try {
		const response = await axiosInstance.post("/docentes", {
			formData: data,
		});
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
		return response.data;
	} catch (error) {
		console.error("Erro ao deletar docente:", error);
		throw error;
	}
}

// Exportação padrão para manter compatibilidade
const docentesService = {
	getDocentes,
	createDocente,
	updateDocente,
	deleteDocente,
};

export default docentesService;
