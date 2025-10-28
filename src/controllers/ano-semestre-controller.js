import anoSemestreService from "../services/ano-semestre-service.js";
import horariosService from "../services/horarios-service.js";

/**
 * Carrega anos/semestres disponíveis
 */
export async function loadAnosSemestres() {
	try {
		const anosSemestres = await anoSemestreService.getAnosSemestres();
		return { anosSemestres };
	} catch (error) {
		console.error("Erro ao carregar anos/semestres:", error);
		throw error;
	}
}

/**
 * Auto-seleciona o ano/semestre mais apropriado baseado em regras:
 * 1. Mais recente rascunho (publicado === false)
 * 2. Se o rascunho é anterior ao período atual, usar o período atual
 * 3. Mais recente com horários cadastrados para o curso
 * 4. Mais recente da lista
 */
export async function autoSelectAnoSemestre(anosSemestres, selectedCurso) {
	if (!Array.isArray(anosSemestres) || anosSemestres.length === 0) {
		return null;
	}

	if (!selectedCurso || !selectedCurso.id) {
		return null;
	}

	// 1) Mais recente como rascunho (publicado === false)
	const draft = anosSemestres.find((as) => as.publicado === false);
	if (draft) {
		// Se o draft é anterior ao ano/semestre atual, priorizar o período atual
		const now = new Date();
		const currentAno = now.getFullYear();
		const currentSemestre = now.getMonth() < 6 ? 1 : 2;
		const draftIsBeforeCurrent =
			draft.ano < currentAno ||
			(draft.ano === currentAno && draft.semestre < currentSemestre);

		if (draftIsBeforeCurrent) {
			const existsCurrent = anosSemestres.some(
				(as) =>
					as.ano === currentAno && as.semestre === currentSemestre,
			);
			if (existsCurrent) {
				return { ano: currentAno, semestre: currentSemestre };
			}
		} else {
			return { ano: draft.ano, semestre: draft.semestre };
		}
	}

	// 2) Mais recente com horários cadastrados para o curso selecionado
	try {
		const results = await Promise.all(
			anosSemestres.map(async (as) => {
				try {
					const result = await horariosService.getHorarios({
						ano: as.ano,
						semestre: as.semestre,
						id_curso: selectedCurso.id,
					});
					return { as, count: result.count };
				} catch (_) {
					return { as, count: 0 };
				}
			}),
		);

		const found = results.find((r) => r.count > 0);
		if (found) {
			return { ano: found.as.ano, semestre: found.as.semestre };
		}

		// 3) Nenhum com horários: selecionar o mais recente da lista
		const first = anosSemestres[0];
		return { ano: first.ano, semestre: first.semestre };
	} catch (error) {
		console.error("Erro ao auto-selecionar ano/semestre:", error);
		// Em caso de erro, retornar o primeiro da lista
		const first = anosSemestres[0];
		return { ano: first.ano, semestre: first.semestre };
	}
}

/**
 * Atualiza o status de publicação de um ano/semestre
 */
export async function updatePublicacaoStatus(ano, semestre, publicado) {
	try {
		await anoSemestreService.updatePublicacao(ano, semestre, publicado);
		return {
			success: true,
			message: `Status alterado para ${
				publicado ? "Publicado" : "Rascunho"
			} com sucesso!`,
		};
	} catch (error) {
		console.error("Erro ao atualizar status de publicação:", error);
		return {
			success: false,
			message:
				error.response?.data?.message ||
				error.message ||
				"Erro ao alterar status de publicação",
		};
	}
}

/**
 * Formata uma data para exibição
 */
export function formatarData(data) {
	if (!data) return "Não definida";
	try {
		return new Date(data).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	} catch (error) {
		return "Data inválida";
	}
}

// Exportação padrão
const anoSemestreController = {
	loadAnosSemestres,
	autoSelectAnoSemestre,
	updatePublicacaoStatus,
	formatarData,
};

export default anoSemestreController;
