import axiosInstance from "../auth/axios.js";

// GET - Buscar todos os cursos
export async function getCursos() {
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

// POST - Criar novo curso
export async function createCurso(data) {
	try {
		const response = await axiosInstance.post("/cursos/", {
			formData: data,
		});
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
		return response.data;
	} catch (error) {
		console.error("Erro ao deletar curso:", error);
		throw error;
	}
}

// Exportação padrão para manter compatibilidade
const cursosService = {
	getCursos,
	createCurso,
	updateCurso,
	deleteCurso,
};

export default cursosService;
