import docentesService from "../services/docentes-service.js";

/**
 * Carrega docentes
 */
//

/**
 * Prepara os dados de um docente para edição
 */
export function prepareEditData(data) {
	return {
		codigo: data.codigo || "",
		nome: data.nome || "",
		email: data.email || "",
		sala: data.sala !== null ? data.sala.toString() : "",
	};
}

/**
 * Valida os dados do formulário
 */
export function validateFormData(formData, edit) {
	const errors = [];

	if (!formData.codigo) errors.push("Código é obrigatório");
	if (!formData.nome) errors.push("Nome é obrigatório");

	if (errors.length > 0) {
		return {
			isValid: false,
			message: `Por favor, preencha todos os campos obrigatórios: ${errors.join(", ")}!`,
		};
	}

	return { isValid: true };
}

/**
 * Prepara os dados para envio à API
 */
export function prepareDataForApi(formData) {
	return {
		codigo: formData.codigo,
		nome: formData.nome,
		email: formData.email,
		sala:
			formData.sala === "" ? null : parseInt(formData.sala) || null,
	};
}

/**
 * Salva ou atualiza um docente
 */
export async function saveOrUpdateDocente(formData, edit) {
	try {
		const dataToSend = prepareDataForApi(formData);

		if (edit) {
			await docentesService.updateDocente(dataToSend);
			return {
				success: true,
				message: "Docente atualizado com sucesso!",
			};
		} else {
			await docentesService.createDocente(dataToSend);
			return {
				success: true,
				message: "Docente inserido com sucesso!",
			};
		}
	} catch (error) {
		console.error("Erro ao salvar docente:", error);

		// Tratar erros específicos
		let errorMessage = "Falha ao gravar docente!";

		if (error.response?.data?.message) {
			errorMessage = error.response.data.message;
		} else if (error.response?.status === 409) {
			errorMessage = "Este docente já existe no sistema!";
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
 * Remove um docente
 */
export async function removeDocente(codigo) {
	try {
		await docentesService.deleteDocente(codigo);
		return {
			success: true,
			message: "Docente removido com sucesso!",
		};
	} catch (error) {
		console.error("Erro ao remover docente:", error);
		return {
			success: false,
			message: "Falha ao remover docente!",
		};
	}
}

/**
 * Reset do formulário
 */
export function getResetFormData() {
	return {
		codigo: "",
		nome: "",
		email: "",
		sala: "",
	};
}

// Exportação padrão
const docentesController = {
	prepareEditData,
	validateFormData,
	prepareDataForApi,
	saveOrUpdateDocente,
	removeDocente,
	getResetFormData,
};

export default docentesController;
