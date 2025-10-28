import ccrsService from "../services/ccrs-service.js";

//

/**
 * Prepara os dados de um CCR para edição
 */
export function prepareEditData(data) {
	return {
		id: data.id,
		codigo: data.codigo || "",
		nome: data.nome || "",
		creditos: data.creditos || 4,
		ementa: data.ementa || "",
	};
}

/**
 * Prepara os cursos selecionados para edição
 */
export function prepareCursosSelecionados(data) {
	if (!data.cursos) {
		return [];
	}
	return data.cursos.map((curso) => curso.id);
}

/**
 * Valida os dados do formulário
 */
export function validateFormData(formData, edit) {
	const errors = [];

	if (!formData.codigo) errors.push("Código é obrigatório");
	if (!formData.nome) errors.push("Nome é obrigatório");
	if (!formData.creditos) errors.push("Créditos é obrigatório");

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
		creditos: formData.creditos,
		ementa: formData.ementa,
	};
}

/**
 * Prepara os dados para envio à API na edição
 */
export function prepareDataForUpdate(formData) {
	return formData;
}

/**
 * Salva ou atualiza um CCR
 */
export async function saveOrUpdateCCR(formData, cursosSelecionados, edit) {
	try {
		let dataToSend;
		if (edit) {
			dataToSend = prepareDataForUpdate(formData);
			await ccrsService.updateCCR(dataToSend, cursosSelecionados);
			return {
				success: true,
				message: "CCR atualizado com sucesso!",
			};
		} else {
			dataToSend = prepareDataForCreate(formData);
			await ccrsService.createCCR(dataToSend, cursosSelecionados);
			return {
				success: true,
				message: "CCR inserido com sucesso!",
			};
		}
	} catch (error) {
		console.error("Erro ao salvar CCR:", error);

		// Tratar erros específicos
		let errorMessage = "Falha ao gravar CCR!";

		if (error.response?.data?.message) {
			errorMessage = error.response.data.message;
		} else if (error.response?.status === 409) {
			errorMessage = "Este CCR já existe no sistema!";
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
 * Remove um CCR
 */
export async function removeCCR(id) {
	try {
		await ccrsService.deleteCCR(id);
		return {
			success: true,
			message: "CCR removido com sucesso!",
		};
	} catch (error) {
		console.error("Erro ao remover CCR:", error);
		return {
			success: false,
			message: "Falha ao remover CCR!",
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
		creditos: 4,
		ementa: "",
	};
}

/**
 * Reset dos cursos selecionados
 */
export function getResetCursosSelecionados() {
	return [];
}

// Exportação padrão
const ccrsController = {
	prepareEditData,
	prepareCursosSelecionados,
	validateFormData,
	prepareDataForCreate,
	prepareDataForUpdate,
	saveOrUpdateCCR,
	removeCCR,
	getResetFormData,
	getResetCursosSelecionados,
};

export default ccrsController;
