import cursosService from "../services/cursos-service.js";

/**
 * Carrega cursos vinculados a um usuário
 */
export async function loadCursosByUsuario(userId) {
	try {
		const cursos = await cursosService.getCursosByUsuario(userId);
		return { cursos };
	} catch (error) {
		console.error("Erro ao buscar cursos do usuário:", error);
		throw error;
	}
}

/**
 * Seleciona automaticamente o primeiro curso disponível
 */
export function autoSelectFirstCurso(cursos, currentSelection = null) {
	if (currentSelection) {
		return currentSelection;
	}

	if (!cursos || cursos.length === 0) {
		return null;
	}

	return cursos[0];
}

// Exportação padrão
const usuariosCursosController = {
	loadCursosByUsuario,
	autoSelectFirstCurso,
};

export default usuariosCursosController;

