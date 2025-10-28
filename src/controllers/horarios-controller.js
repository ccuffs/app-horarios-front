import {
	eventToDbFormat,
	dbToEventFormat,
	dayToNumber,
	normalizeTimeFromDB,
	normalizeTimeForComparison,
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
			const horaInicio = normalizeTimeForComparison(horario.hora_inicio);

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

		// Garantir que o ID sempre tenha o sufixo -prof1 ao carregar do banco
		// (caso seja um evento antigo que ainda não tinha o sufixo)
		if (!event.id.includes('-prof')) {
			event.id = `${event.id}-prof1`;
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
 * Função auxiliar para mapear professores aos sufixos corretos
 * Mantém o histórico de qual professor tinha qual sufixo (-prof1 ou -prof2)
 * Novos professores ocupam a primeira posição disponível
 */
function mapProfessoresToSuffixos(event, originalHorarios) {
	const professoresAtuais =
		event.professoresIds && Array.isArray(event.professoresIds)
			? event.professoresIds
			: event.professorId
			? [event.professorId]
			: [];

	// Validar que não há mais de 2 professores
	if (professoresAtuais.length > 2) {
		console.warn(
			`Mais de 2 professores no evento ${event.id}. Limitando a 2.`
		);
		professoresAtuais.splice(2);
	}

	// Buscar o ID base (sem sufixo)
	const baseId = event.id.replace(/-prof\d+$/, "");

	// Mapear histórico de sufixos para cada professor
	const historicoSuffixos = new Map(); // professorId -> sufixo (1 ou 2)

	// Buscar no histórico de horários originais
	originalHorarios.forEach((original) => {
		// Extrair o baseId do original
		const originalBaseId = original.id.replace(/-prof\d+$/, "");

		// Se for do mesmo evento base
		if (originalBaseId === baseId) {
			// Extrair o sufixo
			const match = original.id.match(/-prof(\d+)$/);
			if (match) {
				const sufixo = parseInt(match[1], 10);
				// Mapear o professor ao sufixo que ele tinha
				if (!historicoSuffixos.has(original.codigo_docente)) {
					historicoSuffixos.set(original.codigo_docente, sufixo);
				}
			}
		}
	});

	// Criar lista de sufixos disponíveis (ordenado: 1, 2)
	const sufixosDisponiveis = [1, 2];

	// Primeiro, preservar sufixos de professores que já existem
	const resultado = [];
	const professoresProcessados = new Set();

	professoresAtuais.forEach((professorId) => {
		const sufixoHistorico = historicoSuffixos.get(professorId);
		if (sufixoHistorico && (sufixoHistorico === 1 || sufixoHistorico === 2)) {
			// Mantém o sufixo histórico
			resultado.push({ professorId, sufixo: sufixoHistorico.toString() });
			professoresProcessados.add(professorId);
		}
	});

	// Depois, atribuir sufixos disponíveis aos professores restantes
	professoresAtuais.forEach((professorId) => {
		// Se este professor ainda não foi processado
		if (!professoresProcessados.has(professorId)) {
			// Pegar o primeiro sufixo disponível que não foi usado
			const sufixosUsados = resultado.map((r) => parseInt(r.sufixo, 10));
			for (const sufixo of sufixosDisponiveis) {
				if (!sufixosUsados.includes(sufixo)) {
					resultado.push({ professorId, sufixo: sufixo.toString() });
					break;
				}
			}
		}
	});

	// Ordenar por sufixo para garantir consistência
	resultado.sort((a, b) => parseInt(a.sufixo, 10) - parseInt(b.sufixo, 10));

	return resultado;
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
						// Usar a nova lógica de mapeamento de sufixos
						const mapeamentoProfessores = mapProfessoresToSuffixos(
							event,
							originalHorarios
						);

						mapeamentoProfessores.forEach(({ professorId, sufixo }) => {
							const baseId = event.id.replace(/-prof\d+$/, "");
							const uniqueId = `${baseId}-prof${sufixo}`;

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
						});
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
						// Usar a mesma lógica de mapeamento de sufixos
						const mapeamentoProfessores = mapProfessoresToSuffixos(
							event,
							originalHorarios
						);

						mapeamentoProfessores.forEach(({ professorId, sufixo }) => {
							const baseId = event.id.replace(/-prof\d+$/, "");
							const uniqueId = `${baseId}-prof${sufixo}`;

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
						});
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
				const horaInicio = normalizeTimeForComparison(horario.hora_inicio);

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
					const horaA = normalizeTimeForComparison(a.hora_inicio);
					const horaB = normalizeTimeForComparison(b.hora_inicio);
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

						const hora1Normalizada = normalizeTimeForComparison(h1.hora_inicio);
						const hora2Normalizada = normalizeTimeForComparison(h2.hora_inicio);

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
							const conflict1 = `${h1.id_ccr}-${h1.ano}-${h1.semestre}-${hora1Normalizada}-${h1.duracao}`;
							const conflict2 = `${h2.id_ccr}-${h2.ano}-${h2.semestre}-${hora2Normalizada}-${h2.duracao}`;
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
									hora_inicio: hora1Normalizada,
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
									hora_inicio: hora2Normalizada,
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
