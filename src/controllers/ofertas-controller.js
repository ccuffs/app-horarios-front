import ofertasService from "../services/ofertas-service.js";

/**
 * Carrega ofertas e cursos
 */
//

/**
 * Prepara os dados de uma oferta para edição
 */
export function prepareEditData(data) {
	return {
		ano: data.ano?.toString() || "",
		semestre: data.semestre?.toString() || "",
		id_curso: data.id_curso?.toString() || "",
		fase: data.fase?.toString() || "",
		turno: data.turno || "",
	};
}

/**
 * Prepara os dados para excluir uma oferta
 */
export function prepareDeleteData(row) {
	return {
		ano: row.ano,
		semestre: row.semestre,
		id_curso: row.id_curso,
		fase: row.fase,
	};
}

/**
 * Valida os dados do formulário
 */
export function validateFormData(formData) {
	const errors = [];

	if (!formData.ano) errors.push("Ano é obrigatório");
	if (!formData.semestre) errors.push("Semestre é obrigatório");
	if (!formData.id_curso) errors.push("Curso é obrigatório");
	if (!formData.fase) errors.push("Fase é obrigatória");

	if (errors.length > 0) {
		return {
			isValid: false,
			message: `Por favor, preencha todos os campos obrigatórios: ${errors.join(", ")}!`,
		};
	}

	// Validar se os valores são números válidos
	const ano = parseInt(formData.ano);
	const semestre = parseInt(formData.semestre);
	const idCurso = parseInt(formData.id_curso);
	const fase = parseInt(formData.fase);

	if (isNaN(ano) || isNaN(semestre) || isNaN(idCurso) || isNaN(fase)) {
		return {
			isValid: false,
			message: "Por favor, insira valores numéricos válidos!",
		};
	}

	return { isValid: true };
}

/**
 * Prepara os dados para envio à API
 */
export function prepareDataForApi(formData) {
	return {
		ano: parseInt(formData.ano) || null,
		semestre: parseInt(formData.semestre) || null,
		id_curso: parseInt(formData.id_curso) || null,
		fase: parseInt(formData.fase) || null,
		turno: formData.turno || null,
	};
}

/**
 * Salva ou atualiza uma oferta
 */
export async function saveOrUpdateOferta(formData, edit, dataToSend, oldTurno) {
	try {
		if (edit) {
			await ofertasService.updateOferta(
				dataToSend.ano,
				dataToSend.semestre,
				dataToSend.id_curso,
				dataToSend.fase,
				oldTurno,
				dataToSend,
			);
			return {
				success: true,
				message: "Oferta atualizada com sucesso!",
			};
		} else {
			await ofertasService.createOferta(dataToSend);
			return {
				success: true,
				message: "Oferta inserida com sucesso!",
			};
		}
	} catch (error) {
		console.error("Erro ao salvar oferta:", error);

		// Tratar erros específicos
		let errorMessage = "Erro ao salvar oferta!";

		if (error.response?.data?.message) {
			errorMessage = error.response.data.message;
		} else if (error.response?.status === 409) {
			errorMessage = "Esta oferta já existe no sistema!";
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
 * Remove uma oferta
 */
export async function removeOferta(deleteData) {
	try {
		await ofertasService.deleteOferta(
			deleteData.ano,
			deleteData.semestre,
			deleteData.id_curso,
			deleteData.fase,
		);
		return {
			success: true,
			message: "Oferta removida com sucesso!",
		};
	} catch (error) {
		console.error("Erro ao remover oferta:", error);
		return {
			success: false,
			message: "Falha ao remover oferta!",
		};
	}
}

/**
 * Reset do formulário
 */
export function getResetFormData() {
	return {
		ano: "",
		semestre: "",
		id_curso: "",
		fase: "",
		turno: "",
	};
}

// Exportação padrão
const ofertasController = {
	prepareEditData,
	prepareDeleteData,
	validateFormData,
	prepareDataForApi,
	saveOrUpdateOferta,
	removeOferta,
	getResetFormData,
};

export default ofertasController;
