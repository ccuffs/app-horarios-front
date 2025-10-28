import { Permissoes } from "../enums/permissoes";

// Função utilitária para criar colunas com permissões
export const createColumnWithPermission = (
	columnConfig,
	requiredPermissions,
	hasPermission,
) => {
	return {
		...columnConfig,
		hide: !hasPermission(requiredPermissions),
	};
};

// Função para criar colunas de ações com permissões diferentes
export const createActionColumns = (hasPermission, actions) => {
	const columns = [];

	// Coluna de ações para ADMIN
	if (hasPermission([Permissoes.GRUPOS.ADMIN])) {
		columns.push({
			field: "actionsAdmin",
			headerName: "Ações Admin",
			sortable: false,
			width: 300,
			renderCell: (params) => actions.adminActions(params.row),
		});
	}

	// Coluna de ações para PROFESSOR
	if (hasPermission([Permissoes.GRUPOS.PROFESSOR])) {
		columns.push({
			field: "actionsProfessor",
			headerName: "Ações Professor",
			sortable: false,
			width: 200,
			renderCell: (params) => actions.professorActions(params.row),
		});
	}

	// Coluna de ações para ALUNO
	if (hasPermission([Permissoes.GRUPOS.ALUNO])) {
		columns.push({
			field: "actionsAluno",
			headerName: "Ações Aluno",
			sortable: false,
			width: 150,
			renderCell: (params) => actions.alunoActions(params.row),
		});
	}

	return columns;
};

// Função para filtrar colunas baseado em permissões
export const filterColumnsByPermission = (columns, hasPermission) => {
	return columns.filter((column) => {
		// Se a coluna não tem propriedade hide, sempre mostra
		if (column.hide === undefined) {
			return true;
		}

		// Se hide é uma função, executa ela
		if (typeof column.hide === "function") {
			return !column.hide(hasPermission);
		}

		// Se hide é um valor booleano, retorna o oposto
		return !column.hide;
	});
};
