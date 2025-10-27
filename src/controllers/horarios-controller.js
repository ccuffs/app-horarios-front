import horariosService from "../services/horarios-service.js";
import docentesService from "../services/docentes-service.js";
import ccrsService from "../services/ccrs-service.js";
import ofertasService from "../services/ofertas-service.js";
import {
	eventToDbFormat,
	dbToEventFormat,
	dayToNumber,
	normalizeTimeFromDB,
	getTurnoFromTime,
} from "../components/horarios/utils.js";

/**
 * Carrega todos os dados necessários para a tela de horários
 */
export async function loadAllData(userId) {
	try {
		const [professores, disciplinas] = await Promise.all([
			docentesService.getDocentes(),
			ccrsService.getCCRs(),
		]);

		// Formatar professores
		const professoresFormatados = professores.map((prof) => ({
			id: prof.codigo,
			codigo: prof.codigo,
			name: prof.nome,
			email: prof.email,
			sala: prof.sala,
		}));

		return {
			professores: professoresFormatados,
			disciplinas,
		};
	} catch (error) {
		console.error("Erro ao carregar dados:", error);
		throw error;
	}
}

/**
 * Carrega ofertas com filtros opcionais
 */
export async function loadOfertas(
	selectedAnoSemestre = null,
	selectedCurso = null,
) {
	try {
		const params = {};
		if (
			selectedAnoSemestre?.ano &&
			selectedAnoSemestre?.semestre &&
			selectedCurso?.id
		) {
			params.ano = selectedAnoSemestre.ano;
			params.semestre = selectedAnoSemestre.semestre;
			params.id_curso = selectedCurso.id;
		} else if (selectedCurso?.id) {
			params.id_curso = selectedCurso.id;
		}

		const ofertas = await ofertasService.getOfertas(params);
		return ofertas;
	} catch (error) {
		console.error("Erro ao carregar ofertas:", error);
		throw error;
	}
}

/**
 * Carrega horários do banco de dados com agrupamento por professores
 */
export async function loadHorarios(
	selectedAnoSemestre,
	selectedCurso,
	disciplinas,
	professores,
) {
	try {
		const result = await horariosService.getHorarios({
			ano: selectedAnoSemestre.ano,
			semestre: selectedAnoSemestre.semestre,
			id_curso: selectedCurso?.id || 1,
		});

		const horariosFromDb = result.horarios;

		if (horariosFromDb.length === 0) {
			return {
				events: {},
				originalHorarios: [],
			};
		}

		const eventsFormatted = {};
		const horariosOriginais = [];

		// Agrupar horários por disciplina, dia, horário e fase para detectar múltiplos professores
		const groupedHorarios = {};

		horariosFromDb.forEach((horario) => {
			// Normalizar hora_inicio para garantir agrupamento correto
			let horaInicio = horario.hora_inicio;
			if (typeof horaInicio === "object" && horaInicio !== null) {
				horaInicio = horaInicio.toString().substring(0, 5);
			} else if (horaInicio && horaInicio.length > 5) {
				horaInicio = horaInicio.substring(0, 5);
			}

			const key = `${horario.id_ccr}-${horario.dia_semana}-${horaInicio}-${horario.fase}`;

			if (!groupedHorarios[key]) {
				groupedHorarios[key] = [];
			}
			groupedHorarios[key].push({
				...horario,
				hora_inicio: horaInicio,
			});
		});

		// Processar grupos de horários
		Object.values(groupedHorarios).forEach((grupo) => {
			const baseHorario = grupo[0];

			// Validar apenas dados críticos
			if (!baseHorario.id_ccr) {
				return;
			}

			const event = dbToEventFormat(
				baseHorario,
				disciplinas,
				professores,
			);

			// Validar apenas se conversão básica foi bem sucedida
			if (!event.dayId) {
				return;
			}

			// Se há múltiplos professores para o mesmo horário
			if (grupo.length > 1) {
				// Remover duplicatas de código_docente
				const uniqueProfessores = [
					...new Set(grupo.map((h) => h.codigo_docente)),
				];
				event.professoresIds = uniqueProfessores;
				event.professorId = grupo[0].codigo_docente;
			} else {
				event.professoresIds = [baseHorario.codigo_docente];
				event.professorId = baseHorario.codigo_docente;
			}

			// Usar a fase do banco para posicionamento
			const phase = baseHorario.fase || 1;
			const slotKey = `${event.dayId}-${event.startTime}`;

			// Organizar eventos por fase
			if (!eventsFormatted[phase]) eventsFormatted[phase] = {};
			event.fase = phase;

			// Verificar se já existe evento no slot
			if (eventsFormatted[phase][slotKey]) {
				if (Array.isArray(eventsFormatted[phase][slotKey])) {
					eventsFormatted[phase][slotKey].push(event);
				} else {
					eventsFormatted[phase][slotKey] = [
						eventsFormatted[phase][slotKey],
						event,
					];
				}
			} else {
				eventsFormatted[phase][slotKey] = event;
			}

			// Adicionar aos horários originais (um para cada professor)
			grupo.forEach((horario) => {
				horariosOriginais.push(horario);
			});
		});

		return {
			events: eventsFormatted,
			originalHorarios: horariosOriginais,
		};
	} catch (error) {
		console.error("Erro ao carregar horários:", error);
		throw error;
	}
}

/**
 * Sincroniza horários com o banco de dados
 */
export async function syncHorarios(
	events,
	originalHorarios,
	selectedAnoSemestre,
	selectedCurso,
) {
	try {
		// 1. Montar lista de horários atuais
		const horariosAtuais = [];
		Object.keys(events).forEach((phaseNumber) => {
			const phaseEvents = events[phaseNumber];
			if (phaseEvents) {
				Object.values(phaseEvents).forEach((eventArray) => {
					const eventsInSlot = Array.isArray(eventArray)
						? eventArray
						: [eventArray];
					eventsInSlot.forEach((event) => {
						const hasProfessores =
							(event.professoresIds &&
								Array.isArray(event.professoresIds) &&
								event.professoresIds.length > 0) ||
							event.professorId;

						if (event.disciplinaId && hasProfessores) {
							if (
								event.professoresIds &&
								Array.isArray(event.professoresIds)
							) {
								event.professoresIds.forEach(
									(professorId, index) => {
										let uniqueId = event.id;
										if (event.professoresIds.length > 1) {
											const baseId = event.id.replace(
												/-prof\d+$/,
												"",
											);
											uniqueId = `${baseId}-prof${
												index + 1
											}`;
										}

										const eventoCopy = {
											...event,
											professorId,
											id: uniqueId,
										};
										const dbEvent = eventToDbFormat(
											eventoCopy,
											phaseNumber,
											selectedAnoSemestre,
											selectedCurso,
										);
										horariosAtuais.push(dbEvent);
									},
								);
							} else if (event.professorId) {
								const dbEvent = eventToDbFormat(
									event,
									phaseNumber,
									selectedAnoSemestre,
									selectedCurso,
								);
								horariosAtuais.push(dbEvent);
							}
						}
					});
				});
			}
		});

		// 2. Identificar mudanças
		const novos = [];
		const editados = [];
		const removidosIds = [];

		const originaisPorId = {};
		originalHorarios.forEach((original) => {
			originaisPorId[original.id] = original;
		});

		const horarioFoiModificado = (atual, original) => {
			const hora1 = normalizeTimeFromDB(atual.hora_inicio);
			const hora2 = normalizeTimeFromDB(original.hora_inicio);

			return (
				atual.id_ccr !== original.id_ccr ||
				atual.codigo_docente !== original.codigo_docente ||
				atual.dia_semana !== original.dia_semana ||
				hora1 !== hora2 ||
				atual.duracao !== original.duracao ||
				atual.fase !== original.fase ||
				(atual.comentario || "") !== (original.comentario || "")
			);
		};

		const idsOriginaisProcessados = new Set();

		horariosAtuais.forEach((atual) => {
			const original = originaisPorId[atual.id];

			if (original) {
				idsOriginaisProcessados.add(original.id);
				if (horarioFoiModificado(atual, original)) {
					editados.push(atual);
				}
			} else {
				novos.push(atual);
			}
		});

		originalHorarios.forEach((original) => {
			if (!idsOriginaisProcessados.has(original.id)) {
				removidosIds.push(original.id);
			}
		});

		// 3. Sincronizar apenas se há mudanças
		if (
			novos.length === 0 &&
			editados.length === 0 &&
			removidosIds.length === 0
		) {
			return {
				success: true,
				message: "Nenhuma mudança para sincronizar",
				horariosAtuais,
			};
		}

		// 4. Enviar para o backend
		await horariosService.syncHorarios(novos, editados, removidosIds);

		return {
			success: true,
			message: "Horários sincronizados com sucesso!",
			horariosAtuais,
		};
	} catch (error) {
		console.error("Erro ao sincronizar horários:", error);
		throw error;
	}
}

/**
 * Importa horários de outro período
 */
export async function importHorarios(
	selectedAnoSemestreOrigem,
	selectedAnoSemestre,
	selectedCurso,
	incluirDocentes,
	incluirOfertas,
) {
	try {
		if (!selectedAnoSemestreOrigem || !selectedCurso) {
			throw new Error(
				"Selecione um ano/semestre de origem e um curso",
			);
		}

		const result = await horariosService.importarHorarios(
			selectedAnoSemestreOrigem.ano,
			selectedAnoSemestreOrigem.semestre,
			selectedAnoSemestre.ano,
			selectedAnoSemestre.semestre,
			selectedCurso.id,
			incluirDocentes,
			incluirOfertas,
		);

		return {
			success: true,
			message: `Importação realizada com sucesso! ${
				result.horarios_importados || 0
			} horários e ${result.ofertas_importadas || 0} ofertas criados.`,
		};
	} catch (error) {
		console.error("Erro ao importar horários:", error);
		throw error;
	}
}

/**
 * Calcula contagem de mudanças pendentes
 */
export function getChangesCount(
	events,
	originalHorarios,
	selectedAnoSemestre,
	selectedCurso,
) {
	if (originalHorarios === null || originalHorarios === undefined) {
		return { added: 0, modified: 0, removed: 0, total: 0 };
	}

	const horariosAtuais = [];
	Object.keys(events).forEach((phaseNumber) => {
		const phaseEvents = events[phaseNumber];
		if (phaseEvents) {
			Object.values(phaseEvents).forEach((eventArray) => {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				eventsInSlot.forEach((event) => {
					const hasProfessores =
						(event.professoresIds &&
							Array.isArray(event.professoresIds) &&
							event.professoresIds.length > 0) ||
						event.professorId;

					if (event.disciplinaId && hasProfessores) {
						if (
							event.professoresIds &&
							Array.isArray(event.professoresIds)
						) {
							event.professoresIds.forEach(
								(professorId, index) => {
									let uniqueId = event.id;
									if (event.professoresIds.length > 1) {
										const baseId = event.id.replace(
											/-prof\d+$/,
											"",
										);
										uniqueId = `${baseId}-prof${index + 1}`;
									}

									const eventoCopy = {
										...event,
										professorId,
										id: uniqueId,
									};
									const dbEvent = eventToDbFormat(
										eventoCopy,
										phaseNumber,
										selectedAnoSemestre,
										selectedCurso,
									);
									horariosAtuais.push(dbEvent);
								},
							);
						} else if (event.professorId) {
							const dbEvent = eventToDbFormat(
								event,
								phaseNumber,
								selectedAnoSemestre,
								selectedCurso,
							);
							horariosAtuais.push(dbEvent);
						}
					}
				});
			});
		}
	});

	let added = 0,
		modified = 0,
		removed = 0;

	const originaisPorId = {};
	originalHorarios.forEach((original) => {
		originaisPorId[original.id] = original;
	});

	const horarioFoiModificado = (atual, original) => {
		const hora1 = normalizeTimeFromDB(atual.hora_inicio);
		const hora2 = normalizeTimeFromDB(original.hora_inicio);

		return (
			atual.id_ccr !== original.id_ccr ||
			atual.codigo_docente !== original.codigo_docente ||
			atual.dia_semana !== original.dia_semana ||
			hora1 !== hora2 ||
			atual.duracao !== original.duracao ||
			atual.fase !== original.fase ||
			(atual.comentario || "") !== (original.comentario || "")
		);
	};

	const idsOriginaisProcessados = new Set();

	horariosAtuais.forEach((atual) => {
		const original = originaisPorId[atual.id];

		if (original) {
			idsOriginaisProcessados.add(original.id);
			if (horarioFoiModificado(atual, original)) {
				modified++;
			}
		} else {
			added++;
		}
	});

	originalHorarios.forEach((original) => {
		if (!idsOriginaisProcessados.has(original.id)) {
			removed++;
		}
	});

	return { added, modified, removed, total: added + modified + removed };
}

/**
 * Conta horários válidos (com disciplina e professor)
 */
export function getValidHorariosCount(events) {
	let count = 0;
	Object.keys(events).forEach((phaseNumber) => {
		const phaseEvents = events[phaseNumber];
		if (phaseEvents) {
			Object.values(phaseEvents).forEach((eventArray) => {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				eventsInSlot.forEach((event) => {
					const hasProfessores =
						(event.professoresIds &&
							Array.isArray(event.professoresIds) &&
							event.professoresIds.length > 0) ||
						event.professorId;
					if (event.disciplinaId && hasProfessores) {
						const numProfessores =
							event.professoresIds &&
							Array.isArray(event.professoresIds)
								? event.professoresIds.length
								: 1;
						count += numProfessores;
					}
				});
			});
		}
	});
	return count;
}

/**
 * Calcula créditos por docente no semestre atual
 */
export function calcularCreditosSemestreAtual(events, disciplinas) {
	const mapa = new Map();
	if (!events || !disciplinas || disciplinas.length === 0) return mapa;

	const creditosPorCcr = new Map(
		disciplinas.map((d) => [String(d.id), Number(d.creditos) || 0]),
	);

	const vistos = new Set();

	Object.keys(events).forEach((phaseNumber) => {
		const phaseEvents = events[phaseNumber];
		if (!phaseEvents) return;
		Object.values(phaseEvents).forEach((eventArray) => {
			const eventsInSlot = Array.isArray(eventArray)
				? eventArray
				: [eventArray];
			eventsInSlot.forEach((ev) => {
				if (!ev?.disciplinaId) return;
				const creditos =
					creditosPorCcr.get(String(ev.disciplinaId)) || 0;
				const professoresIds = Array.isArray(ev.professoresIds)
					? ev.professoresIds
					: ev.professorId
					? [ev.professorId]
					: [];
				professoresIds.forEach((cod) => {
					const docente = String(cod);
					const turno = getTurnoFromTime(ev.startTime);
					const par = `${docente}-${String(
						ev.disciplinaId,
					)}-${turno}`;
					if (vistos.has(par)) return;
					vistos.add(par);
					const atual = mapa.get(docente) || 0;
					mapa.set(docente, atual + creditos);
				});
			});
		});
	});

	return mapa;
}

/**
 * Calcula créditos de outro semestre para média anual
 */
export async function calcularCreditosOutroSemestre(
	selectedCurso,
	selectedAnoSemestre,
	disciplinas,
) {
	try {
		if (!selectedCurso?.id || !selectedAnoSemestre?.ano) {
			return new Map();
		}
		const outroSemestre = selectedAnoSemestre.semestre === 1 ? 2 : 1;

		const result = await horariosService.getHorarios({
			ano: selectedAnoSemestre.ano,
			semestre: outroSemestre,
			id_curso: selectedCurso.id,
		});

		const horarios = result.horarios;
		const creditosPorCcr = new Map(
			disciplinas.map((d) => [String(d.id), Number(d.creditos) || 0]),
		);

		const mapa = new Map();
		const vistos = new Set();

		horarios.forEach((h) => {
			if (!h?.id_ccr || !h?.codigo_docente) return;
			const docente = String(h.codigo_docente);
			const turno = getTurnoFromTime(h.hora_inicio);
			const par = `${docente}-${String(h.id_ccr)}-${turno}`;
			if (vistos.has(par)) return;
			vistos.add(par);
			const creditos = creditosPorCcr.get(String(h.id_ccr)) || 0;
			const atual = mapa.get(docente) || 0;
			mapa.set(docente, atual + creditos);
		});

		return mapa;
	} catch (e) {
		console.error("Erro ao carregar créditos do outro semestre:", e);
		return new Map();
	}
}

// Exportação padrão
const horariosController = {
	loadAllData,
	loadOfertas,
	loadHorarios,
	syncHorarios,
	importHorarios,
	getChangesCount,
	getValidHorariosCount,
	calcularCreditosSemestreAtual,
	calcularCreditosOutroSemestre,
};

export default horariosController;

