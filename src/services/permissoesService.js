import authService from "./authService.js";

const permissoesService = {};

permissoesService.verificarPermissaoPorId = (permissoes, permissaoId) => {
	if (!permissoes || !Array.isArray(permissoes)) {
		return false;
	}

	return permissoes.some((permissao) => permissao.id === permissaoId);
};

permissoesService.verificarPermissaoPorIds = (permissoes, permissaoIds) => {
	if (!permissoes || !Array.isArray(permissoes)) {
		return false;
	}

	if (!Array.isArray(permissaoIds)) {
		permissaoIds = [permissaoIds];
	}

	const resultado = permissaoIds.some((id) =>
		permissoes.some((permissao) => permissao.id === id),
	);

	return resultado;
};

permissoesService.verificarPermissaoPorGrupos = (
	gruposUsuario,
	gruposRequeridos,
) => {
	if (!gruposUsuario || !Array.isArray(gruposUsuario)) {
		return false;
	}

	if (!Array.isArray(gruposRequeridos)) {
		gruposRequeridos = [gruposRequeridos];
	}

	// Verificar se o usuário tem pelo menos um dos grupos requeridos
	const resultado = gruposRequeridos.some((grupoRequerido) => {
		// Se grupoRequerido é um número (ID do grupo)
		if (typeof grupoRequerido === "number") {
			return gruposUsuario.some((grupo) => grupo.id === grupoRequerido);
		}
		// Se grupoRequerido é uma string (nome do grupo)
		else if (typeof grupoRequerido === "string") {
			return gruposUsuario.some((grupo) => grupo.nome === grupoRequerido);
		}
		// Se grupoRequerido é um objeto com id ou nome
		else if (typeof grupoRequerido === "object") {
			if (grupoRequerido.id) {
				return gruposUsuario.some(
					(grupo) => grupo.id === grupoRequerido.id,
				);
			}
			if (grupoRequerido.nome) {
				return gruposUsuario.some(
					(grupo) => grupo.nome === grupoRequerido.nome,
				);
			}
		}
		return false;
	});

	return resultado;
};

/**
 * Força a atualização do cache de permissões
 * Útil quando as permissões do usuário são alteradas no servidor
 */
permissoesService.atualizarCachePermissoes = async () => {
	try {
		await authService.clearPermissionsCache();
		return true;
	} catch (error) {
		console.error("Erro ao atualizar cache de permissões:", error);
		return false;
	}
};

export default permissoesService;
