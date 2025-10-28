import cursosService from "../services/cursos-service.js";

/**
 * Prepara os dados de um curso para edição
 */
export function prepareEditData(data) {
	return {
		id: data.id,
		codigo: data.codigo || "",
		nome: data.nome || "",
		turno: data.turno || "",
	};
}

/**
 * Prepara os dados de turno para edição
 */
export function getTurnoFromData(data) {
	return data.turno || "";
}

/**
 * Valida os dados do formulário
 */
export function validateFormData(formData, edit) {
	const errors = [];

	if (!formData.codigo) errors.push("Código é obrigatório");
	if (!formData.nome) errors.push("Nome é obrigatório");
	if (!formData.turno) errors.push("Turno é obrigatório");

	if (errors.length > 0) {
		return {
			isValid: false,
			message: `Por favor, preencha todos os campos obrigatórios: ${errors.join(", ")}!`,
		};
	}

	return { isValid: true };
}

/**
 * Prepara os dados para envio à API na criação
 */
export function prepareDataForCreate(formData) {
	return {
		codigo: formData.codigo,
		nome: formData.nome,
		turno: formData.turno,
	};
}

/**
 * Prepara os dados para envio à API na edição
 */
export function prepareDataForUpdate(formData) {
	return formData;
}

/**
 * Salva ou atualiza um curso
 */
export async function saveOrUpdateCurso(formData, edit) {
	try {
		let dataToSend;
		if (edit) {
			dataToSend = prepareDataForUpdate(formData);
			await cursosService.updateCurso(dataToSend);
			return {
				success: true,
				message: "Curso atualizado com sucesso!",
			};
		} else {
			dataToSend = prepareDataForCreate(formData);
			await cursosService.createCurso(dataToSend);
			return {
				success: true,
				message: "Curso inserido com sucesso!",
			};
		}
	} catch (error) {
		console.error("Erro ao salvar curso:", error);

		// Tratar erros específicos
		let errorMessage = "Falha ao gravar curso!";

		if (error.response?.data?.message) {
			errorMessage = error.response.data.message;
		} else if (error.response?.status === 409) {
			errorMessage = "Este curso já existe no sistema!";
		} else if (error.response?.status === 400) {
			errorMessage = "Dados inválidos. Verifique os campos preenchidos!";
		}

		return {
			success: false,
			message: errorMessage,
		};
	}
}

/**
 * Remove um curso
 */
export async function removeCurso(id) {
	try {
		await cursosService.deleteCurso(id);
		return {
			success: true,
			message: "Curso removido com sucesso!",
		};
	} catch (error) {
		console.error("Erro ao remover curso:", error);
		return {
			success: false,
			message: "Falha ao remover curso!",
		};
	}
}

/**
 * Reset do formulário
 */
export function getResetFormData() {
	return {
		id: "",
		codigo: "",
		nome: "",
		turno: "",
	};
}

/**
 * Reset do turno selecionado
 */
export function getResetTurno() {
	return "";
}

// Exportação padrão
const cursosController = {
	prepareEditData,
	getTurnoFromData,
	validateFormData,
	prepareDataForCreate,
	prepareDataForUpdate,
	saveOrUpdateCurso,
	removeCurso,
	getResetFormData,
	getResetTurno,
};

export default cursosController;
