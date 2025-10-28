import {
	eventToDbFormat,
	dbToEventFormat,
	dayToNumber,
	normalizeTimeFromDB,
	getTurnoFromTime,
} from "../utils/horariosUtils.js";

/**
 * Formata professores da API para o formato da aplicação
 */
export function formatProfessores(professores) {
	return professores.map((prof) => ({
		id: prof.codigo,
		codigo: prof.codigo,
		name: prof.nome,
		email: prof.email,
		sala: prof.sala,
	}));
}

/**
 * Processa e formata horários do banco de dados com agrupamento por professores
 */
export function processHorarios(
	horariosFromDb,
	disciplinas,
	professores,
) {
	try {

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
 * Prepara dados de horários para sincronização (identifica novos, editados e removidos)
 */
export function prepareSyncData(
	events,
	originalHorarios,
	selectedAnoSemestre,
	selectedCurso,
) {
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

	return {
		novos,
		editados,
		removidosIds,
		horariosAtuais,
		hasChanges: novos.length > 0 || editados.length > 0 || removidosIds.length > 0,
	};
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
 * Calcula créditos de outro semestre a partir dos horários fornecidos
 */
export function calcularCreditosOutroSemestre(
	horarios,
	disciplinas,
) {
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
}


/**
 * Detecta e formata conflitos de horários entre professores
 */
export function detectarConflitos(
	events,
	horariosSalvosPorProfessor,
	professores,
	disciplinas,
	anosSemestres,
	selectedAnoSemestre,
	horariosSeOverlapam,
	dayToNumber,
	daysOfWeek,
) {
	const conflitos = [];
	const conflitosProcessados = new Set();

	// Processar cada professor
	for (const [codigoProfessor, horariosSalvos] of Object.entries(horariosSalvosPorProfessor)) {
		if (codigoProfessor === "sem.professor") continue;

		try {
			// Coletar horários temporários (não salvos ou modificados)
			const horariosTemporarios = [];
			Object.keys(events).forEach((phaseNumber) => {
				const phaseEvents = events[phaseNumber];
				if (phaseEvents) {
					Object.values(phaseEvents).forEach((eventArray) => {
						const eventsInSlot = Array.isArray(eventArray)
							? eventArray
							: [eventArray];
						eventsInSlot.forEach((event) => {
							const professoresDoEvento =
								event.professoresIds &&
								Array.isArray(event.professoresIds)
									? event.professoresIds
									: event.professorId
									? [event.professorId]
									: [];

							if (professoresDoEvento.includes(codigoProfessor)) {
								const jaExisteNoSalvo = horariosSalvos.some(
									(salvo) => {
										return (
											salvo.id_ccr === event.disciplinaId &&
											salvo.dia_semana === dayToNumber[event.dayId] &&
											salvo.hora_inicio === event.startTime &&
											salvo.codigo_docente === codigoProfessor &&
											salvo.ano === selectedAnoSemestre.ano &&
											salvo.semestre === selectedAnoSemestre.semestre
										);
									},
								);

								if (
									!jaExisteNoSalvo &&
									event.disciplinaId &&
									!event.permitirConflito
								) {
									horariosTemporarios.push({
										codigo_docente: codigoProfessor,
										dia_semana: dayToNumber[event.dayId],
										hora_inicio: event.startTime,
										duracao: event.duration || 2,
										ano: selectedAnoSemestre.ano,
										semestre: selectedAnoSemestre.semestre,
										id_ccr: event.disciplinaId,
										disciplinaNome: event.title,
										tipo: "temporario",
										eventoId: event.id,
										uniqueKey: `temp-${event.id}`,
										permitirConflito: event.permitirConflito || false,
									});
								}
							}
						});
					});
				}
			});

			// Combinar horários salvos e temporários
			const todosHorarios = [...horariosSalvos, ...horariosTemporarios];

			// Remover duplicatas
			const eventosUnicos = new Map();
			const chavesDuplicacao = new Set();

			todosHorarios.forEach((horario) => {
				let horaInicio = horario.hora_inicio;
				if (typeof horaInicio === "object") {
					horaInicio = horaInicio.toString().substring(0, 5);
				}
				if (horaInicio && horaInicio.includes(":")) {
					horaInicio = horaInicio.split(":").slice(0, 2).join(":");
				}

				const chaveCompleta = `${codigoProfessor}-${horario.id_ccr}-${horario.dia_semana}-${horaInicio}-${horario.duracao}-${horario.ano}-${horario.semestre}`;

				if (chavesDuplicacao.has(chaveCompleta)) {
					return;
				}
				chavesDuplicacao.add(chaveCompleta);

				const eventoId = horario.eventoId || horario.id;
				if (eventoId) {
					const prioridade =
						horario.tipo === "novo"
							? 3
							: horario.tipo === "temporario"
							? 2
							: 1;
					const existente = eventosUnicos.get(eventoId);

					if (!existente || prioridade > existente.prioridade) {
						eventosUnicos.set(eventoId, {
							...horario,
							prioridade,
							hora_inicio: horaInicio,
						});
					}
				} else {
					eventosUnicos.set(chaveCompleta, {
						...horario,
						hora_inicio: horaInicio,
					});
				}
			});

			const horariosFinais = Array.from(eventosUnicos.values());

			// Agrupar por dia
			const horariosPorDia = {};
			horariosFinais.forEach((horario) => {
				const dia = horario.dia_semana;
				if (!horariosPorDia[dia]) {
					horariosPorDia[dia] = [];
				}
				horariosPorDia[dia].push(horario);
			});

			// Verificar conflitos dentro de cada dia
			Object.entries(horariosPorDia).forEach(([dia, horariosNoDia]) => {
				horariosNoDia.sort((a, b) => {
					const horaA =
						typeof a.hora_inicio === "object"
							? a.hora_inicio.toString()
							: a.hora_inicio;
					const horaB =
						typeof b.hora_inicio === "object"
							? b.hora_inicio.toString()
							: b.hora_inicio;
					return horaA.localeCompare(horaB);
				});

				for (let i = 0; i < horariosNoDia.length; i++) {
					for (let j = i + 1; j < horariosNoDia.length; j++) {
						const h1 = horariosNoDia[i];
						const h2 = horariosNoDia[j];

						const evento1Id = h1.eventoId || h1.id;
						const evento2Id = h2.eventoId || h2.id;

						if (evento1Id && evento2Id && evento1Id === evento2Id) {
							continue;
						}

						if (h1.ano !== h2.ano || h1.semestre !== h2.semestre) {
							continue;
						}

						const hora1 =
							typeof h1.hora_inicio === "object"
								? h1.hora_inicio.toString().substring(0, 5)
								: h1.hora_inicio;
						const hora2 =
							typeof h2.hora_inicio === "object"
								? h2.hora_inicio.toString().substring(0, 5)
								: h2.hora_inicio;

						const hora1Normalizada = hora1?.split(":").slice(0, 2).join(":");
						const hora2Normalizada = hora2?.split(":").slice(0, 2).join(":");

						const saoOMesmoHorario =
							h1.id_ccr === h2.id_ccr &&
							hora1Normalizada === hora2Normalizada &&
							h1.ano === h2.ano &&
							h1.semestre === h2.semestre &&
							h1.dia_semana === h2.dia_semana &&
							h1.codigo_docente === h2.codigo_docente;

						if (saoOMesmoHorario) {
							continue;
						}

						if (h1.permitirConflito || h2.permitirConflito) {
							continue;
						}

						if (h1.id_ccr === h2.id_ccr && h1.fase !== h2.fase) {
							continue;
						}

						if (h1.id_ccr && h2.id_ccr && horariosSeOverlapam(h1, h2)) {
							const conflict1 = `${h1.id_ccr}-${h1.ano}-${h1.semestre}-${hora1}-${h1.duracao}`;
							const conflict2 = `${h2.id_ccr}-${h2.ano}-${h2.semestre}-${hora2}-${h2.duracao}`;
							const sortedConflicts = [conflict1, conflict2].sort();
							const conflictId = `${codigoProfessor}-${dia}-${sortedConflicts.join("---")}`;

							if (conflitosProcessados.has(conflictId)) {
								continue;
							}
							conflitosProcessados.add(conflictId);

							const professor = professores.find(
								(p) => p.codigo === codigoProfessor,
							);
							const disciplina1 = disciplinas.find((d) => d.id === h1.id_ccr);
							const disciplina2 = disciplinas.find((d) => d.id === h2.id_ccr);

							const novoConflito = {
								id: conflictId,
								professor: professor ? professor.name : codigoProfessor,
								codigoProfessor,
								dia: dia,
								diaNome:
									daysOfWeek.find(
										(d) => dayToNumber[d.id] === parseInt(dia),
									)?.title || `Dia ${dia}`,
								horario1: {
									...h1,
									disciplinaNome:
										h1.disciplinaNome ||
										(disciplina1
											? disciplina1.nome
											: "Disciplina não encontrada"),
									hora_inicio: hora1,
									ano_semestre: `${h1.ano}/${h1.semestre}`,
									tipo: h1.tipo || "salvo",
								},
								horario2: {
									...h2,
									disciplinaNome:
										h2.disciplinaNome ||
										(disciplina2
											? disciplina2.nome
											: "Disciplina não encontrada"),
									hora_inicio: hora2,
									ano_semestre: `${h2.ano}/${h2.semestre}`,
									tipo: h2.tipo || "salvo",
								},
							};

							conflitos.push(novoConflito);
						}
					}
				}
			});
		} catch (error) {
			console.error(
				`Erro ao verificar conflitos para professor ${codigoProfessor}:`,
				error,
			);
		}
	}

	return conflitos;
}

// Exportação padrão
const horariosController = {
	formatProfessores,
	processHorarios,
	prepareSyncData,
	getChangesCount,
	getValidHorariosCount,
	calcularCreditosSemestreAtual,
	calcularCreditosOutroSemestre,
	detectarConflitos,
};

export default horariosController;
