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
export function processHorarios(horariosFromDb, disciplinas, professores) {
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
			if (!event.id.includes("-prof")) {
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
 * Implementa as regras de sufixos conforme especificado:
 * 1. Primeiro docente adicionado possui sufixo -prof1
 * 2. Caso haja um docente no evento, o segundo docente adicionado recebe sufixo -prof2
 * 3. Caso docente -prof2 seja removido, o próximo docente adicionado recebe sufixo -prof2
 * 4. Caso docente -prof1 seja removido e haja um -prof2, -prof2 se mantém e ao adicionar um novo docente, este recebe -prof1
 * 5. Caso ambos -prof1 e -prof2 sejam removidos, partimos da regra 1
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
			`Mais de 2 professores no evento ${event.id}. Limitando a 2.`,
		);
		professoresAtuais.splice(2);
	}

	// Buscar o ID base (sem sufixo)
	const baseId = event.id.replace(/-prof\d+$/, "");

	// Mapear histórico de sufixos para cada professor nos originais
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

	// Se não há professores atuais, retornar array vazio
	if (professoresAtuais.length === 0) {
		return [];
	}

	// CASO 1: Apenas 1 professor atual
	if (professoresAtuais.length === 1) {
		const profId = professoresAtuais[0];
		const sufixoHistorico = historicoSuffixos.get(profId);

		if (sufixoHistorico) {
			// Professor já existia, mantém seu sufixo
			return [
				{ professorId: profId, sufixo: sufixoHistorico.toString() },
			];
		}

		// Professor novo - precisa determinar qual sufixo dar
		// Se não há histórico (evento novo), dá -prof1
		if (historicoSuffixos.size === 0) {
			return [{ professorId: profId, sufixo: "1" }];
		}

		// Se há histórico mas este professor não está nele, é um professor novo
		// Descobrir qual sufixo estava ocupado e dar o disponível
		const sufixosOcupados = new Set(historicoSuffixos.values());

		// IMPORTANTE: Regra do usuário - quando substitui um docente (atualização),
		// o novo docente sempre recebe -prof1 pois substitui o registro existente
		// Mesmo que -prof1 tenha sido removido, o novo docente assume -prof1

		// Se havia apenas -prof1 no histórico e foi removido
		if (sufixosOcupados.has(1) && !sufixosOcupados.has(2)) {
			// Novo professor recebe -prof1 (substitui o que foi removido)
			return [{ professorId: profId, sufixo: "1" }];
		}

		// Se havia apenas -prof2 no histórico e foi removido
		if (sufixosOcupados.has(2) && !sufixosOcupados.has(1)) {
			// Novo professor também recebe -prof1 (substitui e passa a ser o primeiro)
			return [{ professorId: profId, sufixo: "1" }];
		}

		// Se ambos foram removidos (caso de 2 professores removidos e 1 adicionado)
		// Novo professor recebe -prof1
		return [{ professorId: profId, sufixo: "1" }];
	}

	// CASO 2: 2 professores atuais
	if (professoresAtuais.length === 2) {
		const resultado = [];
		const sufixosUsados = new Set();

		// PRIMEIRO PASSO: Manter sufixos dos professores que já existiam
		professoresAtuais.forEach((profId) => {
			const sufixoHistorico = historicoSuffixos.get(profId);
			if (sufixoHistorico) {
				resultado.push({
					professorId: profId,
					sufixo: sufixoHistorico.toString(),
				});
				sufixosUsados.add(sufixoHistorico);
			}
		});

		// SEGUNDO PASSO: Atribuir sufixos aos professores novos
		professoresAtuais.forEach((profId) => {
			// Se já foi processado, pular
			if (resultado.some((r) => r.professorId === profId)) {
				return;
			}

			// Professor novo - atribuir primeiro sufixo disponível (1 ou 2)
			if (!sufixosUsados.has(1)) {
				resultado.push({ professorId: profId, sufixo: "1" });
				sufixosUsados.add(1);
			} else if (!sufixosUsados.has(2)) {
				resultado.push({ professorId: profId, sufixo: "2" });
				sufixosUsados.add(2);
			}
		});

		// Ordenar por sufixo para consistência
		resultado.sort(
			(a, b) => parseInt(a.sufixo, 10) - parseInt(b.sufixo, 10),
		);

		return resultado;
	}

	// Por padrão, primeiro professor recebe -prof1
	return [{ professorId: professoresAtuais[0], sufixo: "1" }];
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
							originalHorarios,
						);

						mapeamentoProfessores.forEach(
							({ professorId, sufixo }) => {
								const baseId = event.id.replace(
									/-prof\d+$/,
									"",
								);
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
							},
						);
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
		hasChanges:
			novos.length > 0 || editados.length > 0 || removidosIds.length > 0,
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
							originalHorarios,
						);

						mapeamentoProfessores.forEach(
							({ professorId, sufixo }) => {
								const baseId = event.id.replace(
									/-prof\d+$/,
									"",
								);
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
							},
						);
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

	// Primeiro, coletar todos os eventos de cada docente+CCR para análise
	const eventosPorDocenteCcr = new Map();

	Object.keys(events).forEach((phaseNumber) => {
		const phaseEvents = events[phaseNumber];
		if (!phaseEvents) return;
		Object.values(phaseEvents).forEach((eventArray) => {
			const eventsInSlot = Array.isArray(eventArray)
				? eventArray
				: [eventArray];
			eventsInSlot.forEach((ev) => {
				if (!ev?.disciplinaId) return;
				const professoresIds = Array.isArray(ev.professoresIds)
					? ev.professoresIds
					: ev.professorId
						? [ev.professorId]
						: [];
				professoresIds.forEach((cod) => {
					const docente = String(cod);
					const chave = `${docente}-${String(ev.disciplinaId)}`;
					if (!eventosPorDocenteCcr.has(chave)) {
						eventosPorDocenteCcr.set(chave, []);
					}
					eventosPorDocenteCcr.get(chave).push({
						diaSemana: ev.dayId || ev.dia_semana || "",
						startTime: ev.startTime,
						turno: getTurnoFromTime(ev.startTime),
					});
				});
			});
		});
	});

	// Agora, analisar cada grupo de eventos (docente+CCR) e determinar quantas vezes contar
	eventosPorDocenteCcr.forEach((eventosGrupo, chave) => {
		const [docente, disciplinaId] = chave.split("-");
		const creditos = creditosPorCcr.get(String(disciplinaId)) || 0;

		// Agrupar eventos por horário de início
		const eventosPorHorario = new Map();
		eventosGrupo.forEach((evento) => {
			if (!eventosPorHorario.has(evento.startTime)) {
				eventosPorHorario.set(evento.startTime, []);
			}
			eventosPorHorario.get(evento.startTime).push(evento);
		});

		// REGRA:
		// - Se tem eventos no MESMO horário em dias DIFERENTES: são turmas diferentes, contar cada uma
		// - Se tem eventos em horários DIFERENTES: é o mesmo CCR dividido, contar apenas 1x

		let creditosParaAdicionar = 0;

		if (eventosPorHorario.size === 1) {
			// Todos os eventos começam no mesmo horário
			// Contar quantos dias diferentes existem (cada dia = uma turma diferente)
			const diasUnicos = new Set(eventosGrupo.map((e) => e.diaSemana))
				.size;
			creditosParaAdicionar = creditos * diasUnicos;
		} else {
			// Eventos em horários diferentes = CCR dividido
			// Contar apenas 1x os créditos
			creditosParaAdicionar = creditos;
		}

		const atual = mapa.get(docente) || 0;
		mapa.set(docente, atual + creditosParaAdicionar);
	});

	return mapa;
}

/**
 * Calcula créditos de outro semestre a partir dos horários fornecidos
 */
export function calcularCreditosOutroSemestre(horarios, disciplinas) {
	const creditosPorCcr = new Map(
		disciplinas.map((d) => [String(d.id), Number(d.creditos) || 0]),
	);

	const mapa = new Map();

	// Primeiro, coletar todos os horários de cada docente+CCR para análise
	const horariosPorDocenteCcr = new Map();

	horarios.forEach((h) => {
		if (!h?.id_ccr || !h?.codigo_docente) return;
		const docente = String(h.codigo_docente);
		const chave = `${docente}-${String(h.id_ccr)}`;
		if (!horariosPorDocenteCcr.has(chave)) {
			horariosPorDocenteCcr.set(chave, []);
		}
		horariosPorDocenteCcr.get(chave).push({
			diaSemana: h.dia_semana || "",
			horaInicio: h.hora_inicio || "",
			turno: getTurnoFromTime(h.hora_inicio),
		});
	});

	// Analisar cada grupo de horários (docente+CCR) e determinar quantas vezes contar
	horariosPorDocenteCcr.forEach((horariosGrupo, chave) => {
		const [docente, ccrId] = chave.split("-");
		const creditos = creditosPorCcr.get(String(ccrId)) || 0;

		// Agrupar horários por horário de início
		const horariosPorHoraInicio = new Map();
		horariosGrupo.forEach((horario) => {
			if (!horariosPorHoraInicio.has(horario.horaInicio)) {
				horariosPorHoraInicio.set(horario.horaInicio, []);
			}
			horariosPorHoraInicio.get(horario.horaInicio).push(horario);
		});

		// REGRA:
		// - Se tem horários no MESMO horário em dias DIFERENTES: são turmas diferentes, contar cada uma
		// - Se tem horários em horários DIFERENTES: é o mesmo CCR dividido, contar apenas 1x

		let creditosParaAdicionar = 0;

		if (horariosPorHoraInicio.size === 1) {
			// Todos os horários começam no mesmo horário
			// Contar quantos dias diferentes existem (cada dia = uma turma diferente)
			const diasUnicos = new Set(horariosGrupo.map((h) => h.diaSemana))
				.size;
			creditosParaAdicionar = creditos * diasUnicos;
		} else {
			// Horários em horários diferentes = CCR dividido
			// Contar apenas 1x os créditos
			creditosParaAdicionar = creditos;
		}

		const atual = mapa.get(docente) || 0;
		mapa.set(docente, atual + creditosParaAdicionar);
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
	for (const [codigoProfessor, horariosSalvos] of Object.entries(
		horariosSalvosPorProfessor,
	)) {
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
											salvo.id_ccr ===
												event.disciplinaId &&
											salvo.dia_semana ===
												dayToNumber[event.dayId] &&
											salvo.hora_inicio ===
												event.startTime &&
											salvo.codigo_docente ===
												codigoProfessor &&
											salvo.ano ===
												selectedAnoSemestre.ano &&
											salvo.semestre ===
												selectedAnoSemestre.semestre
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
										permitirConflito:
											event.permitirConflito || false,
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
				const horaInicio = normalizeTimeForComparison(
					horario.hora_inicio,
				);

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

					const hora1Normalizada = normalizeTimeForComparison(
						h1.hora_inicio,
					);
					const hora2Normalizada = normalizeTimeForComparison(
						h2.hora_inicio,
					);

					// Considerar como "mesmo horário" quando:
					// 1. Mesma disciplina (CCR), mesmo professor, mesmo dia/hora/ano/semestre
					// 2. Ou quando professor, dia, hora, duração, ano e semestre são idênticos (independente do CCR)
					//    Isso trata casos de duplicação de cadastro de CCR
					const mesmosCamposPrincipais =
						hora1Normalizada === hora2Normalizada &&
						h1.ano === h2.ano &&
						h1.semestre === h2.semestre &&
						h1.dia_semana === h2.dia_semana &&
						h1.codigo_docente === h2.codigo_docente &&
						h1.duracao === h2.duracao;

					const saoOMesmoHorario =
						mesmosCamposPrincipais &&
						h1.id_ccr === h2.id_ccr;

					const saoDuplicacaoDeCadastro =
						mesmosCamposPrincipais &&
						h1.id_ccr !== h2.id_ccr;

					if (saoOMesmoHorario || saoDuplicacaoDeCadastro) {
						continue;
					}

						if (h1.permitirConflito || h2.permitirConflito) {
							continue;
						}

						if (h1.id_ccr === h2.id_ccr && h1.fase !== h2.fase) {
							continue;
						}

						if (
							h1.id_ccr &&
							h2.id_ccr &&
							horariosSeOverlapam(h1, h2)
						) {
							const conflict1 = `${h1.id_ccr}-${h1.ano}-${h1.semestre}-${hora1Normalizada}-${h1.duracao}`;
							const conflict2 = `${h2.id_ccr}-${h2.ano}-${h2.semestre}-${hora2Normalizada}-${h2.duracao}`;
							const sortedConflicts = [
								conflict1,
								conflict2,
							].sort();
							const conflictId = `${codigoProfessor}-${dia}-${sortedConflicts.join("---")}`;

							if (conflitosProcessados.has(conflictId)) {
								continue;
							}
							conflitosProcessados.add(conflictId);

							const professor = professores.find(
								(p) => p.codigo === codigoProfessor,
							);
							const disciplina1 = disciplinas.find(
								(d) => d.id === h1.id_ccr,
							);
							const disciplina2 = disciplinas.find(
								(d) => d.id === h2.id_ccr,
							);

							const novoConflito = {
								id: conflictId,
								professor: professor
									? professor.name
									: codigoProfessor,
								codigoProfessor,
								dia: dia,
								diaNome:
									daysOfWeek.find(
										(d) =>
											dayToNumber[d.id] === parseInt(dia),
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

/**
 * Gera sumário detalhado das alterações antes de sincronizar
 */
export function gerarSumarioAlteracoes(
	events,
	originalHorarios,
	selectedAnoSemestre,
	selectedCurso,
	professores,
	disciplinas,
) {
	const { novos, editados, removidosIds } = prepareSyncData(
		events,
		originalHorarios,
		selectedAnoSemestre,
		selectedCurso,
	);

	const alteracoes = {
		inclusoes: [],
		atualizacoes: [],
		remocoes: [],
		modificacoes: [], // Mudanças de atributos (duração, horário, etc.)
	};

	// Mapear professores e disciplinas para facilitar busca
	const professoresMap = new Map(
		professores.map((p) => [String(p.codigo || p.id), p]),
	);
	const disciplinasMap = new Map(disciplinas.map((d) => [String(d.id), d]));

	// Mapear dia da semana para nome
	const diasSemana = {
		1: "Segunda-feira",
		2: "Terça-feira",
		3: "Quarta-feira",
		4: "Quinta-feira",
		5: "Sexta-feira",
		6: "Sábado",
		7: "Domingo",
	};

	// Função auxiliar para formatar hora
	const formatarHora = (hora) => {
		if (!hora) return "";
		const normalizada = normalizeTimeFromDB(hora);
		return normalizada.substring(0, 5); // Retorna HH:MM
	};

	// Função auxiliar para calcular hora fim
	const calcularHoraFim = (horaInicio, duracao) => {
		const hora = normalizeTimeFromDB(horaInicio);
		const [horas, minutos] = hora.split(":").map(Number);
		const totalMinutos = horas * 60 + minutos + duracao * 30;
		const horasFim = Math.floor(totalMinutos / 60);
		const minutosFim = totalMinutos % 60;
		return `${String(horasFim).padStart(2, "0")}:${String(minutosFim).padStart(2, "0")}`;
	};

	// Criar uma estrutura para agrupar por evento (disciplina+dia+hora)
	// Isso nos permite ver quais professores foram adicionados/removidos em cada evento
	const horariosOriginaisPorEvento = new Map();
	const horariosAtuaisPorEvento = new Map();

	// Agrupar horários originais
	originalHorarios.forEach((h) => {
		const horaInicio = normalizeTimeForComparison(h.hora_inicio);
		const key = `${h.id_ccr}-${h.dia_semana}-${horaInicio}`;
		if (!horariosOriginaisPorEvento.has(key)) {
			horariosOriginaisPorEvento.set(key, []);
		}
		horariosOriginaisPorEvento.get(key).push(h);
	});

	// Agrupar horários atuais (novos + editados + existentes não modificados)
	const todosHorariosAtuais = [...novos, ...editados];
	// Adicionar os horários que não foram modificados
	originalHorarios.forEach((original) => {
		if (!removidosIds.includes(original.id)) {
			const jaExiste = todosHorariosAtuais.some(
				(h) => h.id === original.id,
			);
			if (!jaExiste) {
				todosHorariosAtuais.push(original);
			}
		}
	});

	todosHorariosAtuais.forEach((h) => {
		const horaInicio = normalizeTimeForComparison(h.hora_inicio);
		const key = `${h.id_ccr}-${h.dia_semana}-${horaInicio}`;
		if (!horariosAtuaisPorEvento.has(key)) {
			horariosAtuaisPorEvento.set(key, []);
		}
		horariosAtuaisPorEvento.get(key).push(h);
	});

	// Processar cada evento para detectar inclusões e remoções reais
	const eventosProcessados = new Set();

	// Detectar INCLUSÕES (professores que estão no atual mas não no original)
	horariosAtuaisPorEvento.forEach((atuais, key) => {
		eventosProcessados.add(key);
		const originais = horariosOriginaisPorEvento.get(key) || [];

		const professoresOriginais = new Set(
			originais.map((h) => h.codigo_docente),
		);
		const professoresAtuais = new Set(atuais.map((h) => h.codigo_docente));

		// Professores que foram adicionados (estão no atual mas não no original)
		professoresAtuais.forEach((professorId) => {
			if (!professoresOriginais.has(professorId)) {
				const horario = atuais.find(
					(h) => h.codigo_docente === professorId,
				);
				const professor = professoresMap.get(String(professorId));
				const disciplina = disciplinasMap.get(String(horario.id_ccr));

				alteracoes.inclusoes.push({
					docente: professor
						? professor.name || professor.nome
						: professorId,
					ccr: disciplina
						? `${disciplina.codigo} - ${disciplina.nome}`
						: horario.id_ccr,
					diaSemana:
						diasSemana[horario.dia_semana] ||
						`Dia ${horario.dia_semana}`,
					horaInicio: formatarHora(horario.hora_inicio),
					horaFim: calcularHoraFim(
						horario.hora_inicio,
						horario.duracao,
					),
				});
			}
		});
	});

	// Detectar REMOÇÕES (professores que estão no original mas não no atual)
	horariosOriginaisPorEvento.forEach((originais, key) => {
		eventosProcessados.add(key);
		const atuais = horariosAtuaisPorEvento.get(key) || [];

		const professoresOriginais = new Set(
			originais.map((h) => h.codigo_docente),
		);
		const professoresAtuais = new Set(atuais.map((h) => h.codigo_docente));

		// Professores que foram removidos (estão no original mas não no atual)
		professoresOriginais.forEach((professorId) => {
			if (!professoresAtuais.has(professorId)) {
				const horario = originais.find(
					(h) => h.codigo_docente === professorId,
				);
				const professor = professoresMap.get(String(professorId));
				const disciplina = disciplinasMap.get(String(horario.id_ccr));

				alteracoes.remocoes.push({
					docente: professor
						? professor.name || professor.nome
						: professorId,
					ccr: disciplina
						? `${disciplina.codigo} - ${disciplina.nome}`
						: horario.id_ccr,
					diaSemana:
						diasSemana[horario.dia_semana] ||
						`Dia ${horario.dia_semana}`,
					horaInicio: formatarHora(horario.hora_inicio),
					horaFim: calcularHoraFim(
						horario.hora_inicio,
						horario.duracao,
					),
				});
			}
		});
	});

	// Processar ATUALIZAÇÕES (apenas quando há TROCA de docentes, não adição/remoção pura)
	// Regra 5: Removido um docente E adicionado outro no mesmo evento = 1 atualização
	// Regra 7: Adicionado um docente em evento que já tinha outro = 1 inclusão (não é atualização!)
	// Regra 6: Removido um docente de evento sem adicionar outro = 1 remoção (não é atualização!)

	// Detectar apenas TROCAS comparando originais com atuais já agrupados
	const atualizacoesDetectadas = [];

	horariosOriginaisPorEvento.forEach((originais, key) => {
		const atuais = horariosAtuaisPorEvento.get(key) || [];

		const docentesOriginais = new Set(
			originais.map((h) => h.codigo_docente),
		);
		const docentesAtuais = new Set(atuais.map((h) => h.codigo_docente));

		// Docentes que saíram
		const docentesRemovidos = [...docentesOriginais].filter(
			(d) => !docentesAtuais.has(d),
		);
		// Docentes que entraram
		const docentesAdicionados = [...docentesAtuais].filter(
			(d) => !docentesOriginais.has(d),
		);

		// ATUALIZAÇÃO só acontece quando:
		// - Quantidade de docentes removidos = quantidade de docentes adicionados (troca 1:1 ou 2:2)
		// - E ambas as quantidades são > 0
		// Isso garante que:
		// - 1 docente -> 2 docentes = inclusão (não é troca)
		// - 2 docentes -> 1 docente = remoção (não é troca)
		// - 1 docente -> 1 docente diferente = atualização (é troca 1:1)
		// - 2 docentes -> 2 docentes diferentes = 2 atualizações (são trocas 1:1)
		if (
			docentesRemovidos.length > 0 &&
			docentesAdicionados.length > 0 &&
			docentesRemovidos.length === docentesAdicionados.length
		) {
			const horarioRef = originais[0] || atuais[0];

			// Parear 1:1 os docentes removidos com os adicionados
			for (let i = 0; i < docentesRemovidos.length; i++) {
				const docenteRemovido = docentesRemovidos[i];
				const docenteAdicionado = docentesAdicionados[i];

				const professorAntigo = professoresMap.get(
					String(docenteRemovido),
				);
				const professorNovo = professoresMap.get(
					String(docenteAdicionado),
				);
				const disciplina = disciplinasMap.get(
					String(horarioRef.id_ccr),
				);

				atualizacoesDetectadas.push({
					docenteAntigo: professorAntigo
						? professorAntigo.name || professorAntigo.nome
						: docenteRemovido,
					docenteNovo: professorNovo
						? professorNovo.name || professorNovo.nome
						: docenteAdicionado,
					ccr: disciplina
						? `${disciplina.codigo} - ${disciplina.nome}`
						: horarioRef.id_ccr,
					diaSemana:
						diasSemana[horarioRef.dia_semana] ||
						`Dia ${horarioRef.dia_semana}`,
					horaInicio: formatarHora(horarioRef.hora_inicio),
					horaFim: calcularHoraFim(
						horarioRef.hora_inicio,
						horarioRef.duracao,
					),
				});

				// Remover da lista de remoções (pois é uma troca, não remoção pura)
				const idxRemocao = alteracoes.remocoes.findIndex(
					(r) =>
						r.docente ===
							(professoresMap.get(String(docenteRemovido))
								?.name ||
								professoresMap.get(String(docenteRemovido))
									?.nome ||
								docenteRemovido) &&
						r.ccr ===
							(disciplinasMap.get(String(horarioRef.id_ccr))
								? `${disciplinasMap.get(String(horarioRef.id_ccr)).codigo} - ${disciplinasMap.get(String(horarioRef.id_ccr)).nome}`
								: horarioRef.id_ccr),
				);
				if (idxRemocao >= 0) {
					alteracoes.remocoes.splice(idxRemocao, 1);
				}

				// Remover da lista de inclusões (pois é uma troca, não inclusão pura)
				const idxInclusao = alteracoes.inclusoes.findIndex(
					(inc) =>
						inc.docente ===
							(professoresMap.get(String(docenteAdicionado))
								?.name ||
								professoresMap.get(String(docenteAdicionado))
									?.nome ||
								docenteAdicionado) &&
						inc.ccr ===
							(disciplinasMap.get(String(horarioRef.id_ccr))
								? `${disciplinasMap.get(String(horarioRef.id_ccr)).codigo} - ${disciplinasMap.get(String(horarioRef.id_ccr)).nome}`
								: horarioRef.id_ccr),
				);
				if (idxInclusao >= 0) {
					alteracoes.inclusoes.splice(idxInclusao, 1);
				}
			}
		}
		// Se docentesRemovidos.length !== docentesAdicionados.length, não é uma troca
		// Então permanecem como inclusões ou remoções puras nas listas originais
	});

	alteracoes.atualizacoes = atualizacoesDetectadas;

	// Detectar MODIFICAÇÕES de atributos (duração, horário, dia, etc.)
	// Quando o mesmo professor permanece mas os atributos do horário mudam
	const modificacoesDetectadas = [];

	horariosOriginaisPorEvento.forEach((originais, key) => {
		const atuais = horariosAtuaisPorEvento.get(key) || [];

		// Para cada professor que está tanto no original quanto no atual
		originais.forEach((horarioOriginal) => {
			const horarioAtual = atuais.find(
				(h) => h.codigo_docente === horarioOriginal.codigo_docente,
			);

			if (horarioAtual) {
				// Verificar se algum atributo mudou
				const horaInicioOriginal = normalizeTimeForComparison(
					horarioOriginal.hora_inicio,
				);
				const horaInicioAtual = normalizeTimeForComparison(
					horarioAtual.hora_inicio,
				);

				const mudouDuracao =
					horarioOriginal.duracao !== horarioAtual.duracao;
				const mudouHorario = horaInicioOriginal !== horaInicioAtual;
				const mudouDia =
					horarioOriginal.dia_semana !== horarioAtual.dia_semana;

				if (mudouDuracao || mudouHorario || mudouDia) {
					const professor = professoresMap.get(
						String(horarioOriginal.codigo_docente),
					);
					const disciplina = disciplinasMap.get(
						String(horarioOriginal.id_ccr),
					);

					const modificacao = {
						docente: professor
							? professor.name || professor.nome
							: horarioOriginal.codigo_docente,
						ccr: disciplina
							? `${disciplina.codigo} - ${disciplina.nome}`
							: horarioOriginal.id_ccr,
						diaSemanaAntigo:
							diasSemana[horarioOriginal.dia_semana] ||
							`Dia ${horarioOriginal.dia_semana}`,
						diaSemana:
							diasSemana[horarioAtual.dia_semana] ||
							`Dia ${horarioAtual.dia_semana}`,
						horaInicioAntigo: formatarHora(
							horarioOriginal.hora_inicio,
						),
						horaInicio: formatarHora(horarioAtual.hora_inicio),
						horaFimAntigo: calcularHoraFim(
							horarioOriginal.hora_inicio,
							horarioOriginal.duracao,
						),
						horaFim: calcularHoraFim(
							horarioAtual.hora_inicio,
							horarioAtual.duracao,
						),
						mudouDia,
						mudouHorario,
						mudouDuracao,
					};

					modificacoesDetectadas.push(modificacao);
				}
			}
		});
	});

	alteracoes.modificacoes = modificacoesDetectadas;

	return {
		alteracoes,
		totais: {
			inclusoes: alteracoes.inclusoes.length,
			atualizacoes: alteracoes.atualizacoes.length,
			remocoes: alteracoes.remocoes.length,
			modificacoes: alteracoes.modificacoes.length,
			total:
				alteracoes.inclusoes.length +
				alteracoes.atualizacoes.length +
				alteracoes.remocoes.length +
				alteracoes.modificacoes.length,
		},
	};
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
	gerarSumarioAlteracoes,
};

export default horariosController;
