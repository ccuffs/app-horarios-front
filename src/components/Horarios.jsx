import React, {
	useState,
	useEffect,
	useCallback,
	useRef,
	useMemo,
} from "react";
import {
	Typography,
	Box,
	Stack,
	Paper,
	Button,
	// Switch,
	FormControlLabel,
	Checkbox,
	Modal,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	IconButton,
	CircularProgress,
	Alert,
	Autocomplete,
	Tooltip,
	Chip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	List,
	ListItem,
	ListItemText,
	Divider,
	Badge,
	Snackbar,
	useTheme,
	Drawer,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import {
	Close as CloseIcon,
	Save as SaveIcon,
	Delete as DeleteIcon,
	Warning as WarningIcon,
	Schedule as ScheduleIcon,
	Download as DownloadIcon,
	TableChart as TableChartIcon,
	FileCopy as FileCopyIcon,
} from "@mui/icons-material";
import axiosInstance from "../auth/axios";
import { customColors } from "./CustomThemeProvider";
import { useAuth } from "../contexts/AuthContext";
import { Permissoes } from "../enums/permissoes";
import permissoesService from "../services/permissoesService";

const timeSlotsMatutino = [
	"07:30:00",
	"08:00:00",
	"08:30:00",
	"09:00:00",
	"09:30:00",
	"10:00:00",
	"10:30:00",
	"11:00:00",
	"11:30:00",
	"12:00:00",
];

const timeSlotsVespertino = [
	"13:30:00",
	"14:00:00",
	"14:30:00",
	"15:00:00",
	"15:30:00",
	"16:00:00",
	"16:30:00",
	"17:00:00",
	"17:30:00",
	"18:00:00",
];

const timeSlotsNoturno = [
	"19:00:00",
	"19:30:00",
	"20:00:00",
	"20:30:00",
	"21:00:00",
	"21:30:00",
	"22:00:00",
	"22:30:00",
];

// Definições dos turnos para lógica de cores
const firstMatutinoSlots = [
	"07:30:00",
	"08:00:00",
	"08:30:00",
	"09:00:00",
	"09:30:00",
];
const secondMatutinoSlots = ["10:00:00", "10:30:00", "11:00:00", "11:30:00"];
const firstVespertinoSlots = [
	"13:30:00",
	"14:00:00",
	"14:30:00",
	"15:00:00",
	"15:30:00",
];
const secondVespertinoSlots = ["16:00:00", "16:30:00", "17:00:00", "17:30:00"];
const firstNoturnoSlots = ["19:00:00", "19:30:00", "20:00:00", "20:30:00"];
const secondNoturnoSlots = ["21:00:00", "21:30:00", "22:00:00", "22:30:00"];

// NOVA LÓGICA: Identificar todos os slots noturnos para terceiro evento
const allNoturnoSlots = [...firstNoturnoSlots, ...secondNoturnoSlots];
const allMatutinoVespertinoSlots = [
	...firstMatutinoSlots,
	...secondMatutinoSlots,
	...firstVespertinoSlots,
	...secondVespertinoSlots,
];

// Retorna o turno (matutino, vespertino, noturno) dado um horário HH:MM:SS
const getTurnoFromTime = (time) => {
	if (!time || typeof time !== "string") return "desconhecido";
	const t = time.length === 5 ? `${time}:00` : time; // normalizar HH:MM -> HH:MM:SS
	if (timeSlotsMatutino.includes(t)) return "matutino";
	if (timeSlotsVespertino.includes(t)) return "vespertino";
	if (timeSlotsNoturno.includes(t)) return "noturno";
	return "desconhecido";
};

// Função para verificar se um horário é noturno
const isHorarioNoturno = (startTime) => {
	return allNoturnoSlots.includes(startTime);
};

// Função para verificar se um horário é matutino ou vespertino
const isHorarioMatutinoOuVespertino = (startTime) => {
	return allMatutinoVespertinoSlots.includes(startTime);
};

// Função para contar eventos de uma disciplina por turno
const countEventosPorTurno = (disciplinaId, phaseNumber, events) => {
	if (!disciplinaId || !events[phaseNumber])
		return { matutino: 0, vespertino: 0, noturno: 0 };

	let contadores = { matutino: 0, vespertino: 0, noturno: 0 };

	for (const [, eventArray] of Object.entries(events[phaseNumber])) {
		const eventsInSlot = Array.isArray(eventArray)
			? eventArray
			: [eventArray];
		for (const event of eventsInSlot) {
			if (event.disciplinaId === disciplinaId) {
				if (
					[...firstMatutinoSlots, ...secondMatutinoSlots].includes(
						event.startTime,
					)
				) {
					contadores.matutino++;
				} else if (
					[
						...firstVespertinoSlots,
						...secondVespertinoSlots,
					].includes(event.startTime)
				) {
					contadores.vespertino++;
				} else if (allNoturnoSlots.includes(event.startTime)) {
					contadores.noturno++;
				}
			}
		}
	}

	return contadores;
};

// Função para verificar se uma disciplina tem terceiro evento noturno separado
const hasThirdEventNoturnoSeparado = (disciplinaId, phaseNumber, events) => {
	const contadores = countEventosPorTurno(disciplinaId, phaseNumber, events);

	// Se há eventos noturnos E eventos matutinos/vespertinos, o noturno é considerado separado
	const hasMatutinoOuVespertino =
		contadores.matutino > 0 || contadores.vespertino > 0;
	const hasNoturno = contadores.noturno > 0;

	return hasMatutinoOuVespertino && hasNoturno;
};

// Função utilitária para converter HH:MM:SS para HH:MM para exibição
const formatTimeForDisplay = (timeString) => {
	if (!timeString || typeof timeString !== "string") return "";

	// Se já está no formato HH:MM:SS, extrair apenas HH:MM
	if (timeString.includes(":")) {
		const parts = timeString.split(":");
		if (parts.length >= 2) {
			return `${parts[0]}:${parts[1]}`;
		}
	}

	return timeString;
};

// Função utilitária para converter HH:MM para HH:MM:SS para armazenamento
const formatTimeForStorage = (timeString) => {
	if (!timeString || typeof timeString !== "string") return "";

	// Se já inclui segundos, retornar como está
	if (timeString.split(":").length === 3) {
		return timeString;
	}

	// Se é HH:MM, adicionar :00
	if (timeString.split(":").length === 2) {
		return `${timeString}:00`;
	}

	return timeString;
};

// Função utilitária para normalizar horários vindos do banco
const normalizeTimeFromDB = (timeFromDB) => {
	if (!timeFromDB) return "";

	let timeString = timeFromDB;

	// Se é um objeto TIME do Sequelize, converter para string
	if (typeof timeFromDB === "object" && timeFromDB !== null) {
		timeString = timeFromDB.toString();
	}

	// Garantir formato HH:MM:SS
	if (typeof timeString === "string") {
		const parts = timeString.split(":");
		if (parts.length === 2) {
			return `${parts[0]}:${parts[1]}:00`;
		} else if (parts.length >= 3) {
			return `${parts[0]}:${parts[1]}:${parts[2]}`;
		}
	}

	return timeString;
};

// Função para verificar se um horário é válido para início de aula no noturno
const isValidStartTimeNoturno = (time) => {
	// 22:30:00 só serve para mostrar fim de aula, não para iniciar
	return time !== "22:30:00";
};

const daysOfWeek = [
	{ id: "monday", title: "Segunda" },
	{ id: "tuesday", title: "Terça" },
	{ id: "wednesday", title: "Quarta" },
	{ id: "thursday", title: "Quinta" },
	{ id: "friday", title: "Sexta" },
	{ id: "saturday", title: "Sábado" },
];

// Lista de professores e disciplinas carregadas da API
// Estrutura professores: { id: string, codigo: string, name: string, email: string }
// Estrutura disciplinas: { id: number, codigo: string, nome: string, ementa: string }

// Função para remover disciplinas duplicadas
const getUniqueDisciplinas = (disciplinas) => {
	const seen = new Set();
	return disciplinas.filter((disciplina) => {
		// Criar uma chave única baseada no ID (preferencial) ou combinação nome+codigo
		const uniqueKey = disciplina.id
			? disciplina.id.toString()
			: `${disciplina.nome}-${disciplina.codigo}`;

		if (seen.has(uniqueKey)) {
			console.warn(
				`Disciplina duplicada encontrada: ${disciplina.nome} (ID: ${disciplina.id})`,
			);
			return false;
		}

		seen.add(uniqueKey);
		return true;
	});
};

// Mapeamento de dias da semana para números (seguindo padrão do banco)
const dayToNumber = {
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
};

const numberToDay = {
	1: "monday",
	2: "tuesday",
	3: "wednesday",
	4: "thursday",
	5: "friday",
	6: "saturday",
};

// Função para converter evento do formato UI para formato do banco
const eventToDbFormat = (
	event,
	phaseNumber,
	selectedAnoSemestre,
	selectedCurso,
) => {
	const ano = selectedAnoSemestre.ano;
	const semestre = selectedAnoSemestre.semestre;

	return {
		id_curso: selectedCurso?.id || 1, // Usar curso selecionado ou fallback para 1
		id_ccr: event.disciplinaId || event.id_ccr,
		codigo_docente: event.professorId || event.codigo_docente,
		dia_semana: dayToNumber[event.dayId] || event.dia_semana,
		ano: ano,
		semestre: semestre,
		fase: parseInt(phaseNumber, 10), // SEMPRE usar a fase do grid onde está posicionado (forçar número)
		hora_inicio: event.startTime || event.hora_inicio,
		duracao: event.duration || event.duracao,
		comentario: event.comentario || "",
		id: event.id,
		permitirConflito: event.permitirConflito || false,
	};
};

// Função para converter evento do formato do banco para formato UI
const dbToEventFormat = (dbEvent, disciplinas) => {
	const disciplina = disciplinas.find((d) => d.id === dbEvent.id_ccr);
	const dayId = numberToDay[dbEvent.dia_semana];

	// Normalizar hora_inicio usando a função utilitária
	const startTime = normalizeTimeFromDB(dbEvent.hora_inicio);

	const event = {
		id: dbEvent.id,
		title: disciplina ? disciplina.nome : "Disciplina não encontrada",
		startTime: startTime,
		duration: dbEvent.duracao || 2, // Duração padrão se não especificada
		color: getColorByDay(dayId), // Cor inicial padrão - será corrigida depois
		professorId: dbEvent.codigo_docente,
		disciplinaId: dbEvent.id_ccr,
		dayId: dayId,
		// Campos do banco
		id_curso: dbEvent.id_curso,
		id_ccr: dbEvent.id_ccr,
		codigo_docente: dbEvent.codigo_docente,
		dia_semana: dbEvent.dia_semana,
		ano: dbEvent.ano,
		semestre: dbEvent.semestre,
		fase: dbEvent.fase, // Incluir fase do banco
		hora_inicio: startTime,
		duracao: dbEvent.duracao || 2,
		comentario: dbEvent.comentario || "",
		permitirConflito: dbEvent.permitirConflito || false,
	};

	return event;
};

// Sistema de cores por dia da semana - usando cores do tema customizado
const dayColors = {
	monday: customColors.teal, // Teal - Segunda
	tuesday: customColors.tiffanyBlue, // Mint - Terça
	wednesday: customColors.orange, // Orange - Quarta
	thursday: customColors.veronica, // Veronica (Roxo) - Quinta
	friday: customColors.glaucous, // Glaucous (Azul) - Sexta
	saturday: customColors.jet, // Jet (Cinza escuro) - Sábado
};

// Função para obter cor baseada no dia
const getColorByDay = (dayId) => {
	return dayColors[dayId] || "#9C27B0";
};

// Exemplo de eventos iniciais atualizado para usar disciplinaId (agora com arrays)
const initialEvents = {};

// Função para buscar professores de disciplina existente no período da manhã
const getDisciplinaProfessoresFromOtherPeriod = (
	disciplinaId,
	phaseNumber,
	events,
) => {
	if (!disciplinaId || !events[phaseNumber]) return [];

	// Buscar a disciplina no período da manhã vespertina (13:30-15:30)
	const startSlots = [
		"13:30:00",
		"14:00:00",
		"14:30:00",
		"15:00:00",
		"15:30:00",
	];

	for (const [, eventArray] of Object.entries(events[phaseNumber])) {
		// eventArray agora é um array de eventos
		const eventsInSlot = Array.isArray(eventArray)
			? eventArray
			: [eventArray];
		for (const event of eventsInSlot) {
			if (
				event.disciplinaId === disciplinaId &&
				startSlots.includes(event.startTime)
			) {
				// Retornar array de professores
				if (
					event.professoresIds &&
					Array.isArray(event.professoresIds)
				) {
					return event.professoresIds;
				} else if (event.professorId) {
					return [event.professorId]; // Compatibilidade com formato antigo
				}
			}
		}
	}

	return [];
};

// Função para buscar professores de uma disciplina já cadastrada na mesma fase
const getDisciplinaProfessoresFromSamePhase = (
	disciplinaId,
	phaseNumber,
	events,
	currentEventStartTime = null, // NOVO: para considerar contexto de terceiro evento noturno
) => {
	if (!disciplinaId || !events || !events[phaseNumber]) return [];

	const phaseEvents = events[phaseNumber];

	// NOVA LÓGICA: Verificar se há terceiro evento noturno separado
	const hasThirdNoturnoSeparado = hasThirdEventNoturnoSeparado(
		disciplinaId,
		phaseNumber,
		events,
	);

	// Se há terceiro evento noturno separado e temos contexto do evento atual
	if (hasThirdNoturnoSeparado && currentEventStartTime) {
		const isCurrentNoturno = isHorarioNoturno(currentEventStartTime);

		// Buscar professores apenas no mesmo contexto
		for (const [, eventArray] of Object.entries(phaseEvents)) {
			const eventsInSlot = Array.isArray(eventArray)
				? eventArray
				: [eventArray];
			for (const event of eventsInSlot) {
				if (event.disciplinaId === disciplinaId) {
					const isEventNoturno = isHorarioNoturno(event.startTime);

					// Só considerar eventos do mesmo contexto
					if (isCurrentNoturno === isEventNoturno) {
						if (
							event.professoresIds &&
							Array.isArray(event.professoresIds) &&
							event.professoresIds.length > 0
						) {
							return event.professoresIds;
						} else if (event.professorId) {
							return [event.professorId];
						}
					}
				}
			}
		}
		return [];
	}

	// LÓGICA ORIGINAL: Buscar em todos os eventos da mesma fase
	for (const [, eventArray] of Object.entries(phaseEvents)) {
		// eventArray agora é um array de eventos
		const eventsInSlot = Array.isArray(eventArray)
			? eventArray
			: [eventArray];
		for (const event of eventsInSlot) {
			if (event.disciplinaId === disciplinaId) {
				// Retornar array de professores
				if (
					event.professoresIds &&
					Array.isArray(event.professoresIds) &&
					event.professoresIds.length > 0
				) {
					return event.professoresIds;
				} else if (event.professorId) {
					return [event.professorId]; // Compatibilidade com formato antigo
				}
			}
		}
	}

	return [];
};

// Função para buscar professor de disciplina existente no período da manhã (compatibilidade)
const getDisciplinaProfessorFromOtherPeriod = (
	disciplinaId,
	phaseNumber,
	events,
) => {
	const professoresIds = getDisciplinaProfessoresFromOtherPeriod(
		disciplinaId,
		phaseNumber,
		events,
	);
	return professoresIds.length > 0 ? professoresIds[0] : null;
};

// Função para buscar professor de uma disciplina já cadastrada na mesma fase (compatibilidade)
const getDisciplinaProfessorFromSamePhase = (
	disciplinaId,
	phaseNumber,
	events,
	currentEventStartTime = null, // NOVO: para manter compatibilidade com nova lógica
) => {
	const professoresIds = getDisciplinaProfessoresFromSamePhase(
		disciplinaId,
		phaseNumber,
		events,
		currentEventStartTime, // NOVO: passar o contexto
	);
	return professoresIds.length > 0 ? professoresIds[0] : null;
};

// Modal para editar evento
const EventModal = ({
	open,
	onClose,
	event,
	onSave,
	professores,
	disciplinas,
	events,
	selectedPhase,
	anosSemestres,
	selectedAnoSemestre,
	selectedCurso,
	horariosSeOverlapam,
	dayToNumber,
	daysOfWeek,
}) => {
	const [disciplinaId, setDisciplinaId] = useState("");
	const [professoresIds, setProfessoresIds] = useState([]); // Mudança: array de professores
	const [searchTerm, setSearchTerm] = useState("");
	const [professorAutoSelected, setProfessorAutoSelected] = useState(false);
	const [comentario, setComentario] = useState("");
	const [permitirConflito, setPermitirConflito] = useState(false);
	const [conflitosTempoRealLocal, setConflitosTempoRealLocal] = useState([]);
	const [verificandoConflitos, setVerificandoConflitos] = useState(false);
	const [erroValidacao, setErroValidacao] = useState("");
	const [inputValueProfessor, setInputValueProfessor] = useState("");

	// Função para verificar conflitos quando professores são selecionados
	const verificarConflitosTempoReal = async (professoresSelecionados) => {
		if (
			!event ||
			!professoresSelecionados ||
			professoresSelecionados.length === 0
		) {
			setConflitosTempoRealLocal([]);
			return;
		}

		setVerificandoConflitos(true);

		try {
			const eventoSimulado = {
				...event,
				professoresIds: professoresSelecionados,
				dayId: event.dayId,
				startTime: event.startTime,
				duration: event.duration,
				disciplinaId: disciplinaId,
				title: getUniqueDisciplinas(disciplinas).find(
					(d) => d.id === disciplinaId,
				)?.nome,
				permitirConflito: permitirConflito,
			};

			const todosConflitos = [];
			const conflitosSet = new Set(); // Para evitar duplicatas locais

			// Verificar conflitos para cada professor selecionado
			for (const profId of professoresSelecionados) {
				// Ignorar verificação de conflitos para professor sem.professor
				if (profId !== "sem.professor") {
					try {
						// 1. BUSCAR HORÁRIOS SALVOS NO BANCO
						const allHorariosResponse = await Promise.all(
							anosSemestres.map(async (anoSem) => {
								try {
									const response = await axiosInstance.get(
										"/horarios",
										{
											params: {
												ano: anoSem.ano,
												semestre: anoSem.semestre,
												id_curso:
													selectedCurso?.id || 1,
											},
										},
									);
									return response.horarios || [];
								} catch (error) {
									return [];
								}
							}),
						);

						const horariosSalvos = allHorariosResponse
							.flat()
							.filter(
								(h) => h.codigo_docente === profId && h.id_ccr,
							) // Filtrar apenas horários com disciplina
							.map((h) => ({
								...h,
								eventoId: h.id,
								tipo: "salvo",
								uniqueKey: `salvo-${h.id}`,
							}));

						// 2. COLETAR HORÁRIOS TEMPORÁRIOS (TELA)
						const horariosTemporarios = [];
						Object.keys(events).forEach((phaseNumber) => {
							const phaseEvents = events[phaseNumber];
							if (phaseEvents) {
								Object.values(phaseEvents).forEach(
									(eventArray) => {
										const eventsInSlot = Array.isArray(
											eventArray,
										)
											? eventArray
											: [eventArray];
										eventsInSlot.forEach(
											(existingEvent) => {
												const professoresDoEvento =
													existingEvent.professoresIds &&
													Array.isArray(
														existingEvent.professoresIds,
													)
														? existingEvent.professoresIds
														: existingEvent.professorId
														? [
																existingEvent.professorId,
														  ]
														: [];

												if (
													professoresDoEvento.includes(
														profId,
													)
												) {
													// Só adicionar se tem disciplina definida
													if (
														existingEvent.disciplinaId
													) {
														horariosTemporarios.push(
															{
																codigo_docente:
																	profId,
																dia_semana:
																	dayToNumber[
																		existingEvent
																			.dayId
																	],
																hora_inicio:
																	existingEvent.startTime,
																duracao:
																	existingEvent.duration ||
																	2,
																ano: selectedAnoSemestre.ano,
																semestre:
																	selectedAnoSemestre.semestre,
																id_ccr: existingEvent.disciplinaId,
																disciplinaNome:
																	existingEvent.title,
																tipo: "temporario",
																eventoId:
																	existingEvent.id,
																uniqueKey: `temp-${existingEvent.id}`,
															},
														);
													}
												}
											},
										);
									},
								);
							}
						});

						// 3. COMBINAR E REMOVER DUPLICATAS, MANTENDO O MAIS RECENTE
						const eventosUnicos = new Map();
						// Adicionar salvos primeiro
						horariosSalvos.forEach((h) =>
							eventosUnicos.set(h.eventoId, h),
						);
						// Sobrescrever com temporários (que são mais recentes)
						horariosTemporarios.forEach((h) =>
							eventosUnicos.set(h.eventoId, h),
						);

						// REMOVER o evento ATUAL da lista de verificação
						if (eventoSimulado.id) {
							eventosUnicos.delete(eventoSimulado.id);
						}

						const todosHorariosOutros = Array.from(
							eventosUnicos.values(),
						);

						// Criar horário do evento atual sendo editado
						const horarioAtual = {
							codigo_docente: profId,
							dia_semana: dayToNumber[eventoSimulado.dayId],
							hora_inicio: eventoSimulado.startTime,
							duracao: eventoSimulado.duration || 2,
							ano: selectedAnoSemestre.ano,
							semestre: selectedAnoSemestre.semestre,
							id_ccr: eventoSimulado.disciplinaId,
							disciplinaNome: eventoSimulado.title,
							tipo: "novo",
							eventoId: eventoSimulado.id,
							uniqueKey: `novo-${eventoSimulado.id}`,
							permitirConflito: eventoSimulado.permitirConflito,
						};

						// Verificar conflitos do evento atual contra todos os outros
						todosHorariosOutros.forEach((outroHorario) => {
							// CRÍTICO: Nunca comparar o mesmo evento consigo mesmo
							const evento1Id = horarioAtual.eventoId;
							const evento2Id = outroHorario.eventoId;

							if (
								evento1Id &&
								evento2Id &&
								evento1Id === evento2Id
							) {
								return; // Pular comparação do mesmo evento
							}

							// Verificar se há sobreposição de dias
							if (
								horarioAtual.dia_semana !==
								outroHorario.dia_semana
							) {
								return;
							}

							// IMPORTANTE: Só detectar conflitos entre horários do MESMO ano e semestre
							if (
								horarioAtual.ano !== outroHorario.ano ||
								horarioAtual.semestre !== outroHorario.semestre
							) {
								return; // Horários de períodos diferentes não são conflitos
							}

							// Verificar se são exatamente o mesmo horário
							const hora1 =
								typeof horarioAtual.hora_inicio === "object"
									? horarioAtual.hora_inicio
											.toString()
											.substring(0, 5)
									: horarioAtual.hora_inicio;
							const hora2 =
								typeof outroHorario.hora_inicio === "object"
									? outroHorario.hora_inicio
											.toString()
											.substring(0, 5)
									: outroHorario.hora_inicio;

							// Considerar que é o MESMO compromisso (portanto não é conflito) se todos os
							// atributos básicos coincidirem – ignoramos diferença de duração para permitir
							// edições que apenas alteram o tamanho da aula.
							if (
								horarioAtual.id_ccr === outroHorario.id_ccr &&
								hora1 === hora2 &&
								horarioAtual.ano === outroHorario.ano &&
								horarioAtual.semestre ===
									outroHorario.semestre &&
								horarioAtual.dia_semana ===
									outroHorario.dia_semana &&
								horarioAtual.codigo_docente ===
									outroHorario.codigo_docente
							) {
								return; // É o mesmo compromisso (possível edição), não gera conflito
							}

							// Verificar se algum dos eventos permite conflito
							if (
								horarioAtual.permitirConflito ||
								outroHorario.permitirConflito
							) {
								return; // Pular se algum evento permitir conflito
							}

							// Verificar se ambos os horários têm disciplinas e há sobreposição
							if (
								horarioAtual.id_ccr &&
								outroHorario.id_ccr &&
								horariosSeOverlapam(horarioAtual, outroHorario)
							) {
								// Criar ID único para evitar duplicatas
								const conflict1 = `${
									horarioAtual.id_ccr || "null"
								}-${horarioAtual.ano}-${
									horarioAtual.semestre
								}-${hora1}-${horarioAtual.duracao}`;
								const conflict2 = `${
									outroHorario.id_ccr || "null"
								}-${outroHorario.ano}-${
									outroHorario.semestre
								}-${hora2}-${outroHorario.duracao}`;
								const sortedConflicts = [
									conflict1,
									conflict2,
								].sort();
								const conflictId = `${profId}-${
									horarioAtual.dia_semana
								}-${sortedConflicts.join("---")}`;

								// Verificar se já processamos este conflito
								if (conflitosSet.has(conflictId)) {
									return;
								}
								conflitosSet.add(conflictId);

								const disciplina1 = disciplinas.find(
									(d) => d.id === horarioAtual.id_ccr,
								);
								const disciplina2 = disciplinas.find(
									(d) => d.id === outroHorario.id_ccr,
								);

								todosConflitos.push({
									id: conflictId,
									professor:
										professores.find(
											(p) => p.codigo === profId,
										)?.name || profId,
									codigoProfessor: profId,
									dia: horarioAtual.dia_semana,
									diaNome:
										daysOfWeek.find(
											(d) =>
												dayToNumber[d.id] ===
												parseInt(
													horarioAtual.dia_semana,
												),
										)?.title ||
										`Dia ${horarioAtual.dia_semana}`,
									horario1: {
										...horarioAtual,
										disciplinaNome:
											horarioAtual.disciplinaNome ||
											disciplina1?.nome ||
											"Disciplina não encontrada",
										hora_inicio: hora1,
										ano_semestre: `${horarioAtual.ano}/${horarioAtual.semestre}`,
										tipo: horarioAtual.tipo || "novo",
									},
									horario2: {
										...outroHorario,
										disciplinaNome:
											outroHorario.disciplinaNome ||
											disciplina2?.nome ||
											"Disciplina não encontrada",
										hora_inicio: hora2,
										ano_semestre: `${outroHorario.ano}/${outroHorario.semestre}`,
										tipo: outroHorario.tipo || "salvo",
									},
								});
							}
						});
					} catch (error) {
						console.error(
							`Erro ao verificar conflitos para professor ${profId}:`,
							error,
						);
					}
				}
			}

			setConflitosTempoRealLocal(todosConflitos);
		} catch (error) {
			console.error("Erro ao verificar conflitos em tempo real:", error);
			setConflitosTempoRealLocal([]);
		} finally {
			setVerificandoConflitos(false);
		}
	};

	useEffect(() => {
		if (event && disciplinas.length > 0) {
			const uniqueDisciplinas = getUniqueDisciplinas(disciplinas);
			let foundDisciplinaId = event.disciplinaId || "";
			let foundSearchTerm = "";

			// Primeiro, tentar encontrar a disciplina pelo ID
			if (event.disciplinaId) {
				const disciplina = uniqueDisciplinas.find(
					(d) => d.id === event.disciplinaId,
				);
				if (disciplina) {
					foundDisciplinaId = disciplina.id;
					foundSearchTerm = disciplina.nome;
				}
			}
			// Se não tem disciplinaId, tentar encontrar pelo title (compatibilidade com eventos antigos)
			else if (event.title) {
				const disciplina = uniqueDisciplinas.find(
					(d) =>
						d.nome === event.title ||
						d.nome.toLowerCase() === event.title.toLowerCase() ||
						d.codigo === event.title,
				);
				if (disciplina) {
					foundDisciplinaId = disciplina.id;
					foundSearchTerm = disciplina.nome;
				} else {
					// Se não encontrar disciplina exata, tentar busca parcial
					const partialMatch = uniqueDisciplinas.find(
						(d) =>
							d.nome
								.toLowerCase()
								.includes(event.title.toLowerCase()) ||
							event.title
								.toLowerCase()
								.includes(d.nome.toLowerCase()),
					);
					if (partialMatch) {
						foundDisciplinaId = partialMatch.id;
						foundSearchTerm = partialMatch.nome;
					} else {
						// Não encontrou nenhuma disciplina, deixar vazio para permitir busca
						foundSearchTerm = "";
					}
				}
			}

			setDisciplinaId(foundDisciplinaId);
			setSearchTerm(foundSearchTerm);

			// Auto-seleção do professor
			let autoSelectedProfessoresIds = [];

			// Se há professores já definidos no evento
			if (event.professoresIds && Array.isArray(event.professoresIds)) {
				autoSelectedProfessoresIds = [...event.professoresIds];
			} else if (event.professorId) {
				// Compatibilidade com formato antigo (single professor)
				autoSelectedProfessoresIds = [event.professorId];
			}

			// Se tem disciplina selecionada e não tem professores definidos, buscar em todos os eventos existentes
			if (
				foundDisciplinaId &&
				autoSelectedProfessoresIds.length === 0 &&
				events
			) {
				// Tentar buscar professor da manhã vespertina se for período da tarde
				if (
					event.startTime &&
					timeSlotsVespertino.includes(event.startTime) &&
					selectedPhase
				) {
					const timeIndex = timeSlotsVespertino.indexOf(
						event.startTime,
					);

					// Se é período da tarde (16:00:00-18:00:00)
					if (timeIndex >= 5) {
						const morningProfessoresIds =
							getDisciplinaProfessoresFromOtherPeriod(
								foundDisciplinaId,
								selectedPhase,
								events,
							);
						if (
							morningProfessoresIds &&
							morningProfessoresIds.length > 0
						) {
							autoSelectedProfessoresIds = morningProfessoresIds;
						}
					}
				}

				// Se ainda não encontrou professores, buscar em outros horários da mesma fase
				if (autoSelectedProfessoresIds.length === 0 && selectedPhase) {
					const existingProfessoresIds =
						getDisciplinaProfessoresFromSamePhase(
							foundDisciplinaId,
							selectedPhase,
							events,
						);
					if (
						existingProfessoresIds &&
						existingProfessoresIds.length > 0
					) {
						autoSelectedProfessoresIds = existingProfessoresIds;
					}
				}
			}

			setProfessoresIds(autoSelectedProfessoresIds);
			setProfessorAutoSelected(
				autoSelectedProfessoresIds.length > 0 &&
					JSON.stringify(autoSelectedProfessoresIds) !==
						JSON.stringify(
							event.professoresIds ||
								[event.professorId].filter(Boolean),
						),
			);
			setComentario(event.comentario || "");
			setPermitirConflito(event.permitirConflito || false);

			// Verificar conflitos iniciais se há professores
			if (autoSelectedProfessoresIds.length > 0) {
				verificarConflitosTempoReal(autoSelectedProfessoresIds);
			}
		} else if (!event) {
			// Se não há evento, limpar tudo
			setDisciplinaId("");
			setProfessoresIds([]);
			setSearchTerm("");
			setComentario("");
			setPermitirConflito(false);
		}
	}, [
		event,
		open,
		events,
		selectedPhase,
		// getDisciplinaProfessoresFromOtherPeriod,
		disciplinas,
	]);

	const handleSave = () => {
		// Limpar erros anteriores
		setErroValidacao("");

		if (!disciplinaId) {
			setErroValidacao(
				"Por favor, selecione uma disciplina antes de salvar.",
			);
			return;
		}

		if (professoresIds.length === 0) {
			setErroValidacao(
				"Por favor, selecione pelo menos um professor antes de salvar.",
			);
			return;
		}

		const uniqueDisciplinas = getUniqueDisciplinas(disciplinas);
		const disciplina = uniqueDisciplinas.find((d) => d.id === disciplinaId);

		if (!disciplina) {
			setErroValidacao(
				"Disciplina selecionada não é válida. Por favor, selecione uma disciplina válida.",
			);
			console.error("Disciplina não encontrada:", disciplinaId);
			return;
		}

		const eventToSave = {
			...event, // Preservar TODOS os campos do evento original
			title: disciplina.nome,
			disciplinaId: disciplinaId,
			professoresIds: professoresIds, // Agora é array
			professorId: professoresIds[0], // Manter compatibilidade
			comentario: comentario,
			permitirConflito: permitirConflito,

			// Garantir que campos essenciais estejam presentes
			id: event?.id, // Preservar ID para edição
			startTime: event?.startTime, // Preservar horário de início
			duration: event?.duration, // Preservar duração
			dayId: event?.dayId, // Preservar dia da semana
			color: event?.color, // Preservar cor

			// Campos do banco de dados
			id_ccr: disciplinaId,
			codigo_docente: professoresIds[0],
			dia_semana: event?.dia_semana || dayToNumber[event?.dayId],
			hora_inicio: event?.hora_inicio || event?.startTime,
			duracao: event?.duracao || event?.duration,
			fase: event?.fase || selectedPhase,
			ano: event?.ano || selectedAnoSemestre?.ano,
			semestre: event?.semestre || selectedAnoSemestre?.semestre,
		};

		// Primeiro salva os dados
		onSave(eventToSave);
		// Fecha o modal indicando que houve salvamento
		handleClose(true);
	};

	// Fecha o modal. Se "saved" = true significa que o usuário clicou em Salvar; caso contrário, é cancelamento.
	const handleClose = (saved = false) => {
		// Reset form completamente
		setDisciplinaId("");
		setProfessoresIds([]);
		setSearchTerm("");
		setProfessorAutoSelected(false);
		setComentario("");
		setPermitirConflito(false);
		setConflitosTempoRealLocal([]);
		setVerificandoConflitos(false);
		setErroValidacao(""); // Limpar erros de validação
		setInputValueProfessor(""); // Limpar campo de busca de professor
		// Propaga ao componente-pai se houve salvamento ou não
		if (typeof onClose === "function") {
			onClose(saved);
		}
	};

	// Calcular horário de término baseado na duração
	const getEndTime = () => {
		if (!event || !event.startTime || !event.duration) return "N/A";

		// Determinar se é vespertino ou noturno baseado no horário
		const isVespertino = timeSlotsVespertino.includes(event.startTime);
		const timeSlots = isVespertino ? timeSlotsVespertino : timeSlotsNoturno;

		const startIndex = timeSlots.indexOf(event.startTime);
		const endIndex = startIndex + event.duration;

		return timeSlots[endIndex] || "Fim do período";
	};

	// Calcular total de minutos
	const getTotalMinutes = () => {
		return event?.duration ? event.duration * 30 : 0;
	};

	return (
		<Modal
			open={open}
			onClose={() => handleClose(false)}
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Paper
				sx={{
					width: 450,
					maxWidth: "90vw",
					p: 3,
					borderRadius: 2,
					outline: "none",
				}}
			>
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						mb: 3,
					}}
				>
					<Typography variant="h6">
						{event?.id ? "Editar Disciplina" : "Nova Disciplina"}
					</Typography>
					<IconButton onClick={() => handleClose(false)} size="small">
						<CloseIcon />
					</IconButton>
				</Box>

				<Stack spacing={3}>
					<Autocomplete
						value={
							getUniqueDisciplinas(disciplinas).find(
								(d) => d.id === disciplinaId,
							) || null
						}
						onChange={(event, newValue) => {
							const newDisciplinaId = newValue ? newValue.id : "";
							setDisciplinaId(newDisciplinaId);

							// Auto-seleção do professor quando uma disciplina é selecionada
							if (newDisciplinaId && events) {
								let autoSelectedProfessoresIds = [];

								// Verificar se é período da tarde vespertino e buscar na manhã da mesma fase
								if (
									event &&
									event.startTime &&
									timeSlotsVespertino.includes(
										event.startTime,
									) &&
									selectedPhase
								) {
									const timeIndex =
										timeSlotsVespertino.indexOf(
											event.startTime,
										);

									// Se é período da tarde (16:00:00-18:00:00)
									if (timeIndex >= 5) {
										const morningProfessoresIds =
											getDisciplinaProfessoresFromOtherPeriod(
												newDisciplinaId,
												selectedPhase,
												events,
											);
										if (
											morningProfessoresIds &&
											morningProfessoresIds.length > 0
										) {
											autoSelectedProfessoresIds =
												morningProfessoresIds;
										}
									}
								}

								// Se ainda não encontrou professores, buscar em outros horários da mesma fase
								if (
									autoSelectedProfessoresIds.length === 0 &&
									selectedPhase
								) {
									const existingProfessoresIds =
										getDisciplinaProfessoresFromSamePhase(
											newDisciplinaId,
											selectedPhase,
											events,
										);
									if (
										existingProfessoresIds &&
										existingProfessoresIds.length > 0
									) {
										autoSelectedProfessoresIds =
											existingProfessoresIds;
									}
								}

								// Aplicar auto-seleção se encontrou professores
								if (autoSelectedProfessoresIds.length > 0) {
									setProfessoresIds(
										autoSelectedProfessoresIds,
									);
									setProfessorAutoSelected(true);
								} else {
									setProfessorAutoSelected(false);
								}
							}
						}}
						inputValue={searchTerm}
						onInputChange={(event, newInputValue) => {
							setSearchTerm(newInputValue);
						}}
						options={getUniqueDisciplinas(disciplinas)}
						getOptionLabel={(option) => option.nome || ""}
						isOptionEqualToValue={(option, value) =>
							option.id === value.id
						}
						getOptionKey={(option) =>
							option.id
								? option.id.toString()
								: `${option.nome}-${option.codigo}`
						}
						renderInput={(params) => (
							<TextField
								{...params}
								label="Disciplina"
								placeholder="Digite para buscar disciplina..."
								variant="outlined"
								fullWidth
							/>
						)}
						renderOption={(props, option) => (
							<Box
								component="li"
								{...props}
								key={
									option.id
										? option.id.toString()
										: `${option.nome}-${option.codigo}`
								}
							>
								<Box>
									<Typography
										variant="body2"
										fontWeight="bold"
									>
										{option.nome}
									</Typography>
									<Typography
										variant="caption"
										color="textSecondary"
									>
										{option.codigo}{" "}
										{option.id ? `(ID: ${option.id})` : ""}
									</Typography>
								</Box>
							</Box>
						)}
						noOptionsText="Nenhuma disciplina encontrada"
						clearOnBlur={false}
						selectOnFocus
						handleHomeEndKeys
					/>

					<Box>
						<Typography
							variant="body2"
							sx={{ mb: 1, fontWeight: "bold" }}
						>
							Professores (máximo 2)
						</Typography>

						{/* Mostrar professores selecionados com botão de remoção */}
						{professoresIds.length > 0 && (
							<Box sx={{ mb: 2 }}>
								<Stack
									direction="row"
									spacing={1}
									flexWrap="wrap"
									useFlexGap
								>
									{professoresIds.map((profId) => {
										const professor = professores.find(
											(p) => p.codigo === profId,
										);

										// Verificar se este professor específico está em conflito
										const professorEmConflito =
											conflitosTempoRealLocal.some(
												(conflito) =>
													conflito.professor.includes(
														professor?.name,
													) ||
													String(
														conflito.horario1
															.codigo_docente,
													) === String(profId) ||
													String(
														conflito.horario2
															.codigo_docente,
													) === String(profId),
											);

										return (
											<Box
												key={profId}
												sx={{
													display: "flex",
													alignItems: "center",
													gap: 0.5,
												}}
											>
												<Chip
													label={
														professor
															? professor.name
															: profId
													}
													onDelete={() => {
														const newProfessoresIds =
															professoresIds.filter(
																(id) =>
																	id !==
																	profId,
															);
														setProfessoresIds(
															newProfessoresIds,
														);
														setProfessorAutoSelected(
															false,
														);
														setErroValidacao(""); // Limpar erro se havia

														// Verificar conflitos em tempo real
														if (
															newProfessoresIds.length >
															0
														) {
															verificarConflitosTempoReal(
																newProfessoresIds,
															);
														} else {
															setConflitosTempoRealLocal(
																[],
															);
														}
													}}
													color={
														professorAutoSelected
															? "success"
															: "primary"
													}
													variant="filled"
													size="medium"
													sx={{
														backgroundColor:
															professorAutoSelected
																? "#4caf50"
																: undefined,
													}}
												/>

												{/* Badge de conflito para o professor no modal */}
												{professorEmConflito && (
													<Tooltip
														title="Professor com conflito de horário"
														placement="top"
														arrow
													>
														<Box
															sx={{
																width: "16px",
																height: "16px",
																backgroundColor:
																	"#ff5722",
																borderRadius:
																	"50%",
																display: "flex",
																alignItems:
																	"center",
																justifyContent:
																	"center",
																flexShrink: 0,
																boxShadow:
																	"0 1px 3px rgba(0,0,0,0.3)",
																ml: 0.5,
															}}
														>
															<WarningIcon
																sx={{
																	fontSize:
																		"12px",
																	color: "white",
																}}
															/>
														</Box>
													</Tooltip>
												)}
											</Box>
										);
									})}
								</Stack>
							</Box>
						)}

						{/* Campo para adicionar novos professores */}
						<Autocomplete
							value={null} // Sempre null para não mostrar selecionados
							inputValue={inputValueProfessor} // Controlar o valor do input
							onChange={(event, newValue) => {
								if (
									newValue &&
									!professoresIds.includes(newValue.codigo)
								) {
									if (professoresIds.length >= 2) {
										setErroValidacao(
											"Máximo de 2 professores permitidos.",
										);
										return;
									}

									const newProfessoresIds = [
										...professoresIds,
										newValue.codigo,
									];
									setProfessoresIds(newProfessoresIds);
									setProfessorAutoSelected(false);
									setErroValidacao(""); // Limpar erro se havia

									// Limpar o campo de input após seleção
									setInputValueProfessor("");

									// Verificar conflitos em tempo real
									verificarConflitosTempoReal(
										newProfessoresIds,
									);
								}
							}}
							onInputChange={(event, newInputValue) => {
								// Permitir digitação para busca
								setInputValueProfessor(newInputValue);
							}}
							options={professores.filter(
								(prof) => !professoresIds.includes(prof.codigo),
							)}
							getOptionLabel={(prof) => prof.name}
							isOptionEqualToValue={(option, value) =>
								option.codigo === value.codigo
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={
										professoresIds.length === 0
											? "Selecione professores"
											: "Adicionar outro professor"
									}
									placeholder={
										professoresIds.length === 0
											? "Selecione pelo menos um professor..."
											: "Selecione outro professor (opcional)"
									}
									variant="outlined"
									fullWidth
									disabled={professoresIds.length >= 2}
								/>
							)}
							renderOption={(props, prof) => (
								<Box
									component="li"
									{...props}
									key={prof.codigo}
								>
									<Typography variant="body2">
										{prof.name}
									</Typography>
									<Typography
										variant="caption"
										color="textSecondary"
										sx={{ ml: 1 }}
									>
										({prof.codigo})
									</Typography>
								</Box>
							)}
							noOptionsText={
								professoresIds.length >= 2
									? "Máximo de professores atingido"
									: "Nenhum professor encontrado"
							}
						/>
					</Box>
					{professorAutoSelected && (
						<Alert
							severity="success"
							variant="outlined"
							sx={{ mt: 1 }}
						>
							<Typography variant="caption">
								✓ Professores preenchidos automaticamente com
								base em disciplina já cadastrada
							</Typography>
						</Alert>
					)}

					{conflitosTempoRealLocal.length > 0 && (
						<Alert severity="warning" sx={{ mt: 1 }}>
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								{conflitosTempoRealLocal.length} conflito(s)
								detectado(s):
							</Typography>
							{conflitosTempoRealLocal
								.slice(0, 3)
								.map((conflito, index) => (
									<Typography
										key={index}
										variant="caption"
										display="block"
										sx={{ mb: 0.5 }}
									>
										{conflito.professor}: {conflito.diaNome}{" "}
										{conflito.horario1.hora_inicio}(
										{conflito.horario1.tipo === "temporario"
											? "não salvo"
											: conflito.horario1.ano_semestre}
										) vs (
										{conflito.horario2.tipo === "temporario"
											? "não salvo"
											: conflito.horario2.ano_semestre}
										)
									</Typography>
								))}
							{conflitosTempoRealLocal.length > 3 && (
								<Typography
									variant="caption"
									sx={{ fontStyle: "italic" }}
								>
									... e mais{" "}
									{conflitosTempoRealLocal.length - 3}{" "}
									conflito(s)
								</Typography>
							)}
						</Alert>
					)}

					{verificandoConflitos && (
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								mt: 1,
							}}
						>
							<CircularProgress size={16} sx={{ mr: 1 }} />
							<Typography variant="caption" color="textSecondary">
								Verificando conflitos de horários...
							</Typography>
						</Box>
					)}
					{professoresIds.length > 0 && (
						<Box
							sx={{
								mt: 1,
								p: 1,
								backgroundColor: "#f5f5f5",
								borderRadius: 1,
							}}
						>
							<Typography
								variant="caption"
								color="textSecondary"
								display="block"
							>
								{professoresIds.length === 1
									? "1 professor selecionado"
									: `${professoresIds.length} professores selecionados`}
								{professoresIds.length === 2 &&
									" (máximo atingido)"}
							</Typography>
							<Typography
								variant="caption"
								color="primary"
								sx={{ fontStyle: "italic" }}
							>
								💡 Clique no "X" de qualquer professor para
								removê-lo
							</Typography>
						</Box>
					)}

					<TextField
						fullWidth
						label="Comentário (opcional)"
						value={comentario}
						onChange={(e) => setComentario(e.target.value)}
						variant="outlined"
						multiline
						rows={2}
						placeholder="Adicione observações sobre este horário..."
					/>

					<FormControlLabel
						control={
							<Checkbox
								checked={permitirConflito}
								onChange={(e) =>
									setPermitirConflito(e.target.checked)
								}
								color="warning"
							/>
						}
						label={
							<Box>
								<Typography variant="body2">
									Permitir conflito de horários
								</Typography>
								<Typography
									variant="caption"
									color="textSecondary"
								>
									Marque esta opção se este horário pode ter
									sobreposição com outros do mesmo professor
								</Typography>
							</Box>
						}
					/>

					{erroValidacao && (
						<Alert severity="error" sx={{ mt: 1 }}>
							{erroValidacao}
						</Alert>
					)}

					{event && (
						<Box
							sx={{
								p: 2,
								backgroundColor: "#f5f5f5",
								borderRadius: 1,
							}}
						>
							<Typography variant="body2" color="textSecondary">
								<strong>Horário:</strong>{" "}
								{formatTimeForDisplay(event.startTime)} -{" "}
								{formatTimeForDisplay(getEndTime())}
								<br />
								<strong>
									Duração:
								</strong> {getTotalMinutes()} minutos (
								{event.duration} períodos)
								<br />
								<strong>Período:</strong>{" "}
								{timeSlotsMatutino.includes(event.startTime)
									? "Matutino"
									: timeSlotsVespertino.includes(
											event.startTime,
									  )
									? "Vespertino"
									: "Noturno"}
							</Typography>
						</Box>
					)}

					<Box
						sx={{
							display: "flex",
							gap: 2,
							justifyContent: "flex-end",
						}}
					>
						<Button
							onClick={() => handleClose(false)}
							variant="outlined"
						>
							Cancelar
						</Button>
						<Button
							onClick={handleSave}
							variant="contained"
							color={
								conflitosTempoRealLocal.length > 0
									? "warning"
									: "primary"
							}
							disabled={
								!disciplinaId || professoresIds.length === 0
							}
						>
							{conflitosTempoRealLocal.length > 0
								? "Salvar (com conflitos)"
								: "Salvar"}
						</Button>
					</Box>
				</Stack>
			</Paper>
		</Modal>
	);
};

// Modal para importação de horários
const ImportModal = ({
	open,
	onClose,
	anosSemestres,
	selectedAnoSemestreOrigem,
	onAnoSemestreOrigemChange,
	incluirDocentes,
	onIncluirDocentesChange,
	incluirOfertas,
	onIncluirOfertasChange,
	onImport,
	loading,
	error,
	selectedAnoSemestre,
}) => {
	// Filtrar anos/semestres anteriores ao atual
	const anosSemestresAnteriores = anosSemestres.filter(
		(as) =>
			as.ano < selectedAnoSemestre.ano ||
			(as.ano === selectedAnoSemestre.ano &&
				as.semestre < selectedAnoSemestre.semestre),
	);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<FileCopyIcon color="primary" />
				Importar Horários
			</DialogTitle>

			<DialogContent dividers>
				<Box sx={{ mb: 3 }}>
					<Typography variant="body1" sx={{ mb: 2 }}>
						Não foram encontrados horários para o ano/semestre
						selecionado. Deseja importar horários de um ano/semestre
						anterior?
					</Typography>

					<FormControl fullWidth sx={{ mb: 2 }}>
						<InputLabel>Ano/Semestre de Origem</InputLabel>
						<Select
							value={
								selectedAnoSemestreOrigem
									? `${selectedAnoSemestreOrigem.ano}/${selectedAnoSemestreOrigem.semestre}`
									: ""
							}
							onChange={(e) => {
								const [ano, semestre] =
									e.target.value.split("/");
								onAnoSemestreOrigemChange({
									ano: parseInt(ano),
									semestre: parseInt(semestre),
								});
							}}
							label="Ano/Semestre de Origem"
						>
							{anosSemestresAnteriores.map((as) => (
								<MenuItem
									key={`${as.ano}-${as.semestre}`}
									value={`${as.ano}/${as.semestre}`}
								>
									{as.ano}/{as.semestre}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<FormControlLabel
						control={
							<Checkbox
								checked={Boolean(incluirDocentes)}
								onChange={(e) =>
									onIncluirDocentesChange(e.target.checked)
								}
								color="primary"
							/>
						}
						label="Incluir docentes na importação"
					/>

					<Typography
						variant="body2"
						color="textSecondary"
						sx={{ mt: 1, mb: 2 }}
					>
						{incluirDocentes
							? "Os horários serão importados com os docentes originais."
							: "Os horários serão importados com o docente 'sem.professor' para que possam ser editados posteriormente."}
					</Typography>

					<FormControlLabel
						control={
							<Checkbox
								checked={Boolean(incluirOfertas)}
								onChange={(e) =>
									onIncluirOfertasChange(e.target.checked)
								}
								color="primary"
							/>
						}
						label="Incluir ofertas na importação"
					/>

					<Typography
						variant="body2"
						color="textSecondary"
						sx={{ mt: 1 }}
					>
						{incluirOfertas
							? "As ofertas (fases e turnos) serão importadas do ano/semestre de origem."
							: "Apenas os horários serão importados, sem as configurações de ofertas."}
					</Typography>

					{error && (
						<Alert severity="error" sx={{ mt: 2 }}>
							{error}
						</Alert>
					)}
				</Box>
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose} disabled={loading}>
					Cancelar
				</Button>
				<Button
					onClick={onImport}
					variant="contained"
					disabled={!selectedAnoSemestreOrigem || loading}
					startIcon={
						loading ? (
							<CircularProgress size={20} />
						) : (
							<FileCopyIcon />
						)
					}
				>
					{loading ? "Importando..." : "Importar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// Modal para exibir conflitos de horários
const ConflitosModal = ({ open, onClose, conflitos, professores }) => {
	const formatarHorario = (inicio, duracao) => {
		// Normalizar o horário removendo segundos se existirem
		const horarioNormalizado = inicio.split(":").slice(0, 2).join(":");
		const [horas, minutos] = horarioNormalizado.split(":").map(Number);

		const inicioMinutos = horas * 60 + minutos;
		const fimMinutos = inicioMinutos + duracao * 30;
		const fimHoras = Math.floor(fimMinutos / 60);
		const fimMinutosRestantes = fimMinutos % 60;

		return `${horarioNormalizado} - ${fimHoras
			.toString()
			.padStart(2, "0")}:${fimMinutosRestantes
			.toString()
			.padStart(2, "0")}`;
	};

	const conflitosAgrupados = conflitos.reduce((acc, conflito) => {
		const key = conflito.professor;
		if (!acc[key]) {
			acc[key] = [];
		}
		acc[key].push(conflito);
		return acc;
	}, {});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			PaperProps={{
				sx: { maxHeight: "80vh" },
			}}
		>
			<DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<WarningIcon color="warning" />
				Conflitos de Horários Detectados
				<Badge
					badgeContent={conflitos.length}
					color="error"
					sx={{ ml: "auto" }}
				/>
			</DialogTitle>

			<DialogContent dividers>
				{conflitos.length === 0 ? (
					<Box sx={{ textAlign: "center", py: 4 }}>
						<ScheduleIcon
							sx={{ fontSize: 48, color: "success.main", mb: 2 }}
						/>
						<Typography variant="h6" color="success.main">
							Nenhum conflito de horários detectado!
						</Typography>
						<Typography variant="body2" color="textSecondary">
							Todos os professores têm horários compatíveis.
						</Typography>
					</Box>
				) : (
					<Box>
						<Alert severity="warning" sx={{ mb: 2 }}>
							<strong>Atenção:</strong> Foram detectados{" "}
							{conflitos.length} conflito(s) de horários. Os
							professores abaixo têm aulas sobrepostas em
							diferentes semestres.
						</Alert>

						{Object.entries(conflitosAgrupados).map(
							([nomeProf, conflitosProf]) => (
								<Box key={nomeProf} sx={{ mb: 3 }}>
									<Typography
										variant="h6"
										color="error"
										sx={{ mb: 1 }}
									>
										{nomeProf}
									</Typography>

									<List dense>
										{conflitosProf.map(
											(conflito, index) => (
												<ListItem
													key={conflito.id}
													sx={{ pl: 0 }}
												>
													<ListItemText
														primary={
															<Box>
																<Typography
																	variant="subtitle2"
																	color="error"
																>
																	{
																		conflito.diaNome
																	}{" "}
																	-{" "}
																	{formatarHorario(
																		conflito
																			.horario1
																			.hora_inicio,
																		conflito
																			.horario1
																			.duracao,
																	)}
																</Typography>
															</Box>
														}
														secondary={
															<Box sx={{ mt: 1 }}>
																<Typography
																	variant="body2"
																	sx={{
																		mb: 1,
																	}}
																>
																	<strong>
																		Conflito
																		1:
																	</strong>{" "}
																	{
																		conflito
																			.horario1
																			.disciplinaNome
																	}
																	<br />
																	{
																		conflito
																			.horario1
																			.ano_semestre
																	}
																	º semestre
																	{conflito
																		.horario1
																		.tipo ===
																		"temporario" && (
																		<Chip
																			label="Não salvo"
																			size="small"
																			color="info"
																			sx={{
																				ml: 1,
																			}}
																		/>
																	)}
																	{conflito
																		.horario1
																		.tipo ===
																		"novo" && (
																		<Chip
																			label="Editando"
																			size="small"
																			color="warning"
																			sx={{
																				ml: 1,
																			}}
																		/>
																	)}
																	<br />
																	{formatarHorario(
																		conflito
																			.horario1
																			.hora_inicio,
																		conflito
																			.horario1
																			.duracao,
																	)}
																</Typography>

																<Typography variant="body2">
																	<strong>
																		Conflito
																		2:
																	</strong>{" "}
																	{
																		conflito
																			.horario2
																			.disciplinaNome
																	}
																	<br />
																	{
																		conflito
																			.horario2
																			.ano_semestre
																	}
																	º semestre
																	{conflito
																		.horario2
																		.tipo ===
																		"temporario" && (
																		<Chip
																			label="Não salvo"
																			size="small"
																			color="info"
																			sx={{
																				ml: 1,
																			}}
																		/>
																	)}
																	{conflito
																		.horario2
																		.tipo ===
																		"novo" && (
																		<Chip
																			label="Editando"
																			size="small"
																			color="warning"
																			sx={{
																				ml: 1,
																			}}
																		/>
																	)}
																	<br />
																	{formatarHorario(
																		conflito
																			.horario2
																			.hora_inicio,
																		conflito
																			.horario2
																			.duracao,
																	)}
																</Typography>
															</Box>
														}
													/>
												</ListItem>
											),
										)}
									</List>

									{Object.keys(conflitosAgrupados).length >
										1 &&
										Object.keys(conflitosAgrupados).indexOf(
											nomeProf,
										) <
											Object.keys(conflitosAgrupados)
												.length -
												1 && <Divider sx={{ my: 2 }} />}
								</Box>
							),
						)}
					</Box>
				)}
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose} variant="contained">
					Fechar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// Função auxiliar para calcular o horário final de um evento
const getEndTime = (startTime, duration, timeSlots) => {
	const startIndex = timeSlots.indexOf(startTime);
	if (startIndex === -1) return startTime; // Fallback se não encontrar

	const endIndex = startIndex + duration;

	// Se o índice final está dentro dos limites do array, retorna o horário
	if (endIndex < timeSlots.length) {
		return timeSlots[endIndex];
	}

	// Se está fora dos limites, calcula o horário baseado no último slot
	const lastSlot = timeSlots[timeSlots.length - 1];
	const [lastHour, lastMinute] = lastSlot.split(":").map(Number);
	const extraSlots = endIndex - timeSlots.length + 1;
	const extraMinutes = extraSlots * 30; // Assumindo que cada slot é de 30 minutos

	const totalMinutes = lastHour * 60 + lastMinute + extraMinutes;
	const finalHour = Math.floor(totalMinutes / 60);
	const finalMinute = totalMinutes % 60;

	return `${finalHour.toString().padStart(2, "0")}:${finalMinute
		.toString()
		.padStart(2, "0")}`;
};

const CalendarEvent = ({
	event,
	dayId,
	timeSlot,
	onResize,
	onEdit,
	onDelete,
	onMove,
	timeSlots,
	professores,
	isMultiple,
	multipleIndex,
	multipleTotal,
	verificarSeEventoTemConflito,
	obterConflitosDoEvento,
}) => {
	const { permissoesUsuario } = useAuth();
	const canDeleteHorario = permissoesService.verificarPermissaoPorId(
		permissoesUsuario,
		Permissoes.HORARIOS.DELETAR,
	);
	const canEditHorario = permissoesService.verificarPermissaoPorId(
		permissoesUsuario,
		Permissoes.HORARIOS.EDITAR,
	);
	const canManageHorarios =
		permissoesService.verificarPermissaoPorId(
			permissoesUsuario,
			Permissoes.HORARIOS.CRIAR,
		) ||
		permissoesService.verificarPermissaoPorId(
			permissoesUsuario,
			Permissoes.HORARIOS.EDITAR,
		);
	const [isDragging, setIsDragging] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const eventRef = useRef(null);

	const handleMouseDown = useCallback((e) => {
		e.stopPropagation();
		if (!canEditHorario) {
			return;
		}

		if (e.target.classList.contains("resize-handle")) {
			setIsResizing(true);
			e.preventDefault();
		} else {
			setIsDragging(true);
		}
	}, []);

	const handleMouseMove = useCallback(
		(e) => {
			if (!canEditHorario) return;
			if (isResizing && eventRef.current) {
				const container = eventRef.current.closest(".time-grid");
				if (!container) return;

				const containerRect = container.getBoundingClientRect();
				const relativeY = e.clientY - containerRect.top;
				const slotHeight = 30;
				const headerHeight = 40;

				const adjustedY = relativeY - headerHeight;
				const startSlotIndex = timeSlots.indexOf(event.startTime);
				const newDuration = Math.max(
					1,
					Math.ceil(adjustedY / slotHeight) - startSlotIndex,
				);

				if (newDuration !== event.duration && newDuration > 0) {
					onResize(event.id, newDuration);
				}
			}
		},
		[isResizing, event, onResize, timeSlots, canEditHorario],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		setIsResizing(false);
	}, []);

	useEffect(() => {
		if (isDragging || isResizing) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);

			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

	const handleDragStart = (e) => {
		if (!canEditHorario) {
			e.preventDefault();
			return;
		}
		e.dataTransfer.setData("text/plain", JSON.stringify(event));
		e.dataTransfer.effectAllowed = "move";
	};

	// Buscar nomes dos professores
	const getProfessoresInfo = () => {
		let professoresList = [];

		if (event.professoresIds && Array.isArray(event.professoresIds)) {
			professoresList = event.professoresIds
				.map((profId) =>
					professores.find(
						(p) => p.codigo === profId || p.id === profId,
					),
				)
				.filter(Boolean);
		} else if (event.professorId) {
			const professor = professores.find(
				(p) =>
					p.codigo === event.professorId ||
					p.id === event.professorId,
			);
			if (professor) {
				professoresList = [professor];
			}
		}

		// Remover duplicatas baseadas no código do professor
		const uniqueProfessores = professoresList.filter(
			(professor, index, self) =>
				index === self.findIndex((p) => p.codigo === professor.codigo),
		);

		return uniqueProfessores;
	};

	const professoresInfo = getProfessoresInfo();

	// Verificar se o evento tem conflitos
	const temConflito = verificarSeEventoTemConflito
		? verificarSeEventoTemConflito(event)
		: false;
	const conflitosDoEvento = obterConflitosDoEvento
		? obterConflitosDoEvento(event)
		: [];

	// Calcular largura e posição quando há múltiplos eventos
	const calculateMultipleEventStyles = () => {
		if (!isMultiple) {
			return {
				position: "absolute",
				left: 2,
				right: 2,
				top: 0,
			};
		}

		const width = `calc((100% - 4px) / ${multipleTotal} - 1px)`;
		const left = `calc(2px + (${width} + 1px) * ${multipleIndex})`;

		return {
			position: "absolute",
			left: left,
			width: width,
			top: 0,
		};
	};

	const eventContent = (
		<Paper
			ref={eventRef}
			draggable={canEditHorario}
			onDragStart={handleDragStart}
			sx={{
				...calculateMultipleEventStyles(),
				backgroundColor: event.disciplinaId ? event.color : "#9e9e9e", // Cinza se não tem disciplina
				color: "white",
				padding: isMultiple ? "2px 4px" : 1, // Padding mais compacto para múltiplos
				cursor: canEditHorario
					? isDragging
						? "grabbing"
						: "grab"
					: "default",
				height: `${event.duration * 30}px`,
				minHeight: "30px",
				overflow: "hidden",
				zIndex: isDragging || isResizing ? 1000 : 1,
				boxShadow:
					isDragging || isResizing
						? "0 4px 8px rgba(0,0,0,0.3)"
						: "0 1px 3px rgba(0,0,0,0.2)",
				transition: isDragging || isResizing ? "none" : "all 0.2s ease",
				border: !event.disciplinaId ? "2px dashed #fff" : "none", // Borda tracejada se incompleto
				opacity: !event.disciplinaId ? 0.7 : 1, // Reduzir opacidade se incompleto
				"&:hover": {
					boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
					"& .resize-handle": {
						opacity: canEditHorario ? 1 : 0,
					},
				},
			}}
			onMouseDown={handleMouseDown}
			onClick={(e) => {
				e.stopPropagation();
				if (!isDragging && !isResizing && onEdit) {
					if (!canManageHorarios) return;
					onEdit(event);
				}
			}}
		>
			{/* Badge de conflito */}
			{temConflito && (
				<Tooltip
					title={
						<Box>
							<Typography
								variant="body2"
								fontWeight="bold"
								sx={{ mb: 1 }}
							>
								{conflitosDoEvento.length} Conflito(s)
								Detectado(s)
							</Typography>
							{conflitosDoEvento.map((conflito, index) => (
								<Typography
									key={index}
									variant="caption"
									display="block"
									sx={{ mb: 0.5 }}
								>
									• Professor com aula sobreposta em{" "}
									{conflito.diaNome}
								</Typography>
							))}
						</Box>
					}
					placement="top"
					arrow
				>
					<Box
						sx={{
							position: "absolute",
							top: 2,
							left: 2,
							width: "16px",
							height: "16px",
							backgroundColor: "#ff9800",
							borderRadius: "50%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							zIndex: 10,
							boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
							animation: "pulse 2s infinite",
							"@keyframes pulse": {
								"0%": {
									transform: "scale(1)",
									opacity: 1,
								},
								"50%": {
									transform: "scale(1.1)",
									opacity: 0.8,
								},
								"100%": {
									transform: "scale(1)",
									opacity: 1,
								},
							},
						}}
					>
						<WarningIcon
							sx={{
								fontSize: "10px",
								color: "white",
							}}
						/>
					</Box>
				</Tooltip>
			)}

			{/* Botão de delete */}
			{!isMultiple && onDelete && canDeleteHorario && (
				<IconButton
					size="small"
					onClick={(e) => {
						e.stopPropagation();
						onDelete(event.id);
					}}
					sx={{
						position: "absolute",
						top: 2,
						right: 2,
						width: "16px",
						height: "16px",
						color: "rgba(255,255,255,0.7)",
						backgroundColor: "rgba(0,0,0,0.2)",
						"&:hover": {
							backgroundColor: "rgba(255,0,0,0.7)",
							color: "white",
						},
						"& .MuiSvgIcon-root": {
							fontSize: "12px",
						},
					}}
				>
					<DeleteIcon />
				</IconButton>
			)}

			<Typography
				variant="caption"
				sx={{
					fontWeight: "bold",
					display: "block",
					lineHeight: 1.1,
					marginBottom: isMultiple ? 0.1 : 0.5,
					fontSize: isMultiple ? "0.6rem" : "0.75rem",
					paddingLeft: temConflito && !isMultiple ? "20px" : "0", // Espaço para badge de conflito
					paddingRight: !isMultiple ? "20px" : "0", // Espaço para o botão delete
				}}
			>
				{isMultiple
					? event.title
						? event.title.length > 12
							? event.title.substring(0, 12) + "..."
							: event.title
						: "Incompleto"
					: event.title || "Horário incompleto"}
			</Typography>

			{professoresInfo.length > 0 && (
				<Box sx={{ marginBottom: isMultiple ? 0.1 : 0.5 }}>
					{professoresInfo
						.slice(0, isMultiple ? 2 : professoresInfo.length)
						.map((professor, index) => {
							// Verificar se este professor específico está em conflito
							const professorEmConflito = conflitosDoEvento.some(
								(conflito) =>
									String(conflito.codigoProfessor) ===
									String(professor.codigo),
							);

							return (
								<Box
									key={professor.codigo}
									sx={{
										display: "flex",
										alignItems: "center",
										gap: 0.5,
										marginBottom: isMultiple ? 0.05 : 0.1,
									}}
								>
									<Typography
										variant="caption"
										sx={{
											fontSize: isMultiple
												? "0.55rem"
												: "0.65rem",
											opacity: 0.8,
											lineHeight: isMultiple ? 1.1 : 1.2,
										}}
									>
										{isMultiple
											? professor.name.length > 10
												? professor.name.substring(
														0,
														10,
												  ) + "..."
												: professor.name
											: professor.name}
									</Typography>

									{/* Badge de conflito para o professor */}
									{professorEmConflito && (
										<Box
											sx={{
												width: isMultiple
													? "8px"
													: "10px",
												height: isMultiple
													? "8px"
													: "10px",
												backgroundColor: "#ff5722",
												borderRadius: "50%",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
												boxShadow:
													"0 1px 2px rgba(0,0,0,0.3)",
											}}
										>
											<WarningIcon
												sx={{
													fontSize: isMultiple
														? "6px"
														: "8px",
													color: "white",
												}}
											/>
										</Box>
									)}
								</Box>
							);
						})}
					{/* Indicador se há mais professores */}
					{isMultiple && professoresInfo.length > 2 && (
						<Typography
							variant="caption"
							sx={{
								fontSize: "0.5rem",
								opacity: 0.7,
								fontStyle: "italic",
								lineHeight: 1.1,
							}}
						>
							+{professoresInfo.length - 2} mais
						</Typography>
					)}
				</Box>
			)}
			{/* Horário - sempre mostrar, mas com formatação diferente */}
			<Typography
				variant="caption"
				sx={{
					fontSize: isMultiple ? "0.48rem" : "0.7rem",
					opacity: 0.9,
					display: "block",
					lineHeight: 1.1,
					marginBottom: isMultiple
						? event.comentario
							? 0.05
							: 0.1
						: 0,
				}}
			>
				{isMultiple
					? `${formatTimeForDisplay(
							event.startTime,
					  )}-${formatTimeForDisplay(
							getEndTime(
								event.startTime,
								event.duration,
								timeSlots,
							),
					  )}`
					: `${formatTimeForDisplay(
							event.startTime,
					  )} - ${formatTimeForDisplay(
							getEndTime(
								event.startTime,
								event.duration,
								timeSlots,
							),
					  )}`}
			</Typography>

			{/* Mostrar comentário se existir - SEMPRE mostrar quando há comentário */}
			{event.comentario && event.comentario.trim() !== "" && (
				<Typography
					variant="caption"
					sx={{
						fontSize: isMultiple ? "0.45rem" : "0.6rem",
						opacity: isMultiple ? 0.9 : 0.8,
						fontStyle: "italic",
						fontWeight: isMultiple ? "bold" : "normal",
						display: "block",
						lineHeight: isMultiple ? 1.1 : 1.2,
						mt: isMultiple ? 0.05 : 0.5,
						backgroundColor: isMultiple
							? "rgba(255,255,255,0.2)"
							: "rgba(255,255,255,0.15)",
						padding: isMultiple ? "1px 3px" : "2px 4px",
						borderRadius: "2px",
						border: isMultiple
							? "1px solid rgba(255,255,255,0.3)"
							: "none",
						maxWidth: "100%",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						boxShadow: isMultiple
							? "0 1px 2px rgba(0,0,0,0.1)"
							: "none",
					}}
				>
					💬{" "}
					{isMultiple
						? event.comentario.length > 12
							? event.comentario.substring(0, 12) + "..."
							: event.comentario
						: event.comentario}
				</Typography>
			)}

			{/* Resize handle */}
			<Box
				className="resize-handle"
				sx={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					height: "8px",
					backgroundColor: "rgba(255,255,255,0.3)",
					cursor: "ns-resize",
					opacity: 0,
					transition: "opacity 0.2s",
					"&::after": {
						content: '""',
						position: "absolute",
						bottom: "2px",
						left: "50%",
						transform: "translateX(-50%)",
						width: "20px",
						height: "2px",
						backgroundColor: "rgba(255,255,255,0.8)",
						borderRadius: "1px",
					},
				}}
				onMouseDown={(e) => {
					e.stopPropagation();
					if (!canEditHorario) return;
					setIsResizing(true);
					e.preventDefault();
				}}
			/>
		</Paper>
	);

	// Criar tooltip com informações completas para todos os eventos
	const tooltipContent = (
		<Box>
			<Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
				{event.title || "Horário incompleto"}
			</Typography>

			{professoresInfo.length > 0 && (
				<Box sx={{ mb: 1 }}>
					<Typography
						variant="caption"
						display="block"
						sx={{ fontWeight: "bold", mb: 0.5 }}
					>
						Professor{professoresInfo.length > 1 ? "es" : ""}:
					</Typography>
					{professoresInfo.map((professor) => (
						<Typography
							key={professor.codigo}
							variant="caption"
							display="block"
							sx={{ pl: 1, lineHeight: 1.2 }}
						>
							• {professor.name} ({professor.codigo})
						</Typography>
					))}
				</Box>
			)}

			<Typography variant="caption" display="block" sx={{ mb: 1 }}>
				<strong>Horário:</strong>{" "}
				{formatTimeForDisplay(event.startTime)} -{" "}
				{formatTimeForDisplay(
					getEndTime(event.startTime, event.duration, timeSlots),
				)}
			</Typography>

			<Typography variant="caption" display="block" sx={{ mb: 1 }}>
				<strong>Duração:</strong> {event.duration * 30} minutos (
				{event.duration} períodos)
			</Typography>

			{/* Mostrar comentário no tooltip se existir */}
			{event.comentario && (
				<Box
					sx={{
						mt: 1,
						p: 1,
						backgroundColor: "rgba(255,255,255,0.1)",
						borderRadius: 1,
					}}
				>
					<Typography
						variant="caption"
						display="block"
						sx={{ fontStyle: "italic" }}
					>
						<strong>💬 Observação:</strong> {event.comentario}
					</Typography>
				</Box>
			)}

			{/* Mostrar conflitos no tooltip se existir */}
			{temConflito && conflitosDoEvento.length > 0 && (
				<Box
					sx={{
						mt: 1,
						p: 1,
						backgroundColor: "rgba(255,152,0,0.2)",
						borderRadius: 1,
					}}
				>
					<Typography
						variant="caption"
						display="block"
						sx={{ color: "#ff9800", fontWeight: "bold" }}
					>
						⚠️ {conflitosDoEvento.length} Conflito(s) Detectado(s)
					</Typography>
					{conflitosDoEvento.slice(0, 2).map((conflito, index) => (
						<Typography
							key={index}
							variant="caption"
							display="block"
							sx={{ pl: 1, lineHeight: 1.2 }}
						>
							• Professor com aula sobreposta em{" "}
							{conflito.diaNome}
						</Typography>
					))}
				</Box>
			)}

			{!event.disciplinaId && (
				<Box
					sx={{
						mt: 1,
						p: 1,
						backgroundColor: "rgba(158,158,158,0.2)",
						borderRadius: 1,
					}}
				>
					<Typography
						variant="caption"
						display="block"
						sx={{ color: "#666", fontStyle: "italic" }}
					>
						⚠️ Horário incompleto - adicione disciplina e professor
					</Typography>
				</Box>
			)}
		</Box>
	);

	// Sempre usar tooltip para mostrar informações completas
	return (
		<Tooltip title={tooltipContent} placement="top" arrow>
			{eventContent}
		</Tooltip>
	);
};

const TimeSlot = ({
	time,
	dayId,
	events,
	onDropEvent,
	onAddEvent,
	onResize,
	onEdit,
	onDelete,
	timeSlots,
	professores,
	verificarSeEventoTemConflito,
	obterConflitosDoEvento,
	sx, // Propriedade de estilo adicional
}) => {
	const { permissoesUsuario } = useAuth();
	const canManageHorarios =
		permissoesService.verificarPermissaoPorId(
			permissoesUsuario,
			Permissoes.HORARIOS.CRIAR,
		) ||
		permissoesService.verificarPermissaoPorId(
			permissoesUsuario,
			Permissoes.HORARIOS.EDITAR,
		);
	const canEditHorario = permissoesService.verificarPermissaoPorId(
		permissoesUsuario,
		Permissoes.HORARIOS.EDITAR,
	);
	const theme = useTheme();
	const eventKey = `${dayId}-${time}`;
	const eventData = events[eventKey];
	const eventsArray = eventData
		? Array.isArray(eventData)
			? eventData
			: [eventData]
		: [];
	const [isDragOver, setIsDragOver] = useState(false);

	const handleDrop = (e) => {
		e.preventDefault();
		setIsDragOver(false);

		if (!canEditHorario) {
			return;
		}

		try {
			const eventData = JSON.parse(e.dataTransfer.getData("text/plain"));
			onDropEvent(eventData, dayId, time);
		} catch (error) {
			console.error("Error parsing dropped data:", error);
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		if (!canEditHorario) return;
		setIsDragOver(true);
	};

	const handleDragLeave = () => {
		setIsDragOver(false);
	};

	return (
		<Box
			sx={{
				height: "30px",
				border: `1px solid ${theme.palette.divider}`,
				position: "relative",
				backgroundColor: isDragOver
					? theme.palette.mode === "dark"
						? "rgba(144, 202, 249, 0.16)"
						: "#e3f2fd"
					: "transparent",
				"&:hover": {
					backgroundColor: isDragOver
						? theme.palette.mode === "dark"
							? "rgba(144, 202, 249, 0.16)"
							: "#e3f2fd"
						: timeSlotsNoturno.includes(time) &&
						  !isValidStartTimeNoturno(time)
						? theme.palette.mode === "dark"
							? "rgba(255, 255, 255, 0.08)"
							: "#f0f0f0"
						: theme.palette.mode === "dark"
						? "rgba(255, 255, 255, 0.12)"
						: "#f5f5f5",
				},
				transition: "background-color 0.2s ease",
				display: "flex",
				gap: eventsArray.length > 1 ? "1px" : "0",
				cursor: !canEditHorario
					? "default"
					: timeSlotsNoturno.includes(time) &&
					  !isValidStartTimeNoturno(time)
					? "not-allowed"
					: "pointer",
				opacity:
					timeSlotsNoturno.includes(time) &&
					!isValidStartTimeNoturno(time)
						? 0.6
						: 1,
				...(sx || {}), // Aplicar estilos adicionais se fornecidos
			}}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDoubleClick={() => {
				if (!canManageHorarios) return;
				// Verificar se é um horário válido para início de aula
				if (
					timeSlotsNoturno.includes(time) &&
					!isValidStartTimeNoturno(time)
				) {
					return; // Não permitir criar eventos em 22:30:00
				}
				onAddEvent(dayId, time);
			}}
		>
			{eventsArray.map((event, index) => (
				<CalendarEvent
					key={event.id}
					event={event}
					dayId={dayId}
					timeSlot={time}
					onResize={onResize}
					onEdit={onEdit}
					onDelete={onDelete}
					timeSlots={timeSlots}
					professores={professores}
					isMultiple={eventsArray.length > 1}
					multipleIndex={index}
					multipleTotal={eventsArray.length}
					verificarSeEventoTemConflito={verificarSeEventoTemConflito}
					obterConflitosDoEvento={obterConflitosDoEvento}
				/>
			))}
		</Box>
	);
};

const PhaseGrid = ({
	phaseNumber,
	isEvenSemester,
	events,
	onDropEvent,
	onAddEvent,
	onResize,
	onEdit,
	onDelete,
	professores,
	verificarSeEventoTemConflito,
	obterConflitosDoEvento,
	isPhaseVespertino, // Nova prop para determinar turno baseado na oferta
	isPhaseMatutino, // Nova prop para determinar se é turno matutino
	hasMultiplosTurnos, // Para verificar se fase tem múltiplos turnos
	hasTurnoEspecifico, // Para verificar se fase tem turno específico
	getTurnosOferta, // Função para obter turnos da oferta
}) => {
	const theme = useTheme();
	// Verificar se a fase tem múltiplos turnos
	const temMultiplosTurnos = hasMultiplosTurnos(phaseNumber);

	// Se tem múltiplos turnos, mostrar todos; caso contrário usar a lógica padrão
	const isVespertino = isPhaseVespertino(phaseNumber);
	const isMatutino = isPhaseMatutino(phaseNumber);

	// Determinar quais slots de tempo mostrar
	let timeSlots;

	if (temMultiplosTurnos) {
		// Combinar todos os turnos disponíveis
		const turnos = getTurnosOferta(phaseNumber);
		timeSlots = [];

		if (turnos.includes("matutino")) {
			timeSlots = [...timeSlots, ...timeSlotsMatutino];
		}
		if (turnos.includes("vespertino")) {
			timeSlots = [...timeSlots, ...timeSlotsVespertino];
		}
		if (turnos.includes("noturno")) {
			timeSlots = [...timeSlots, ...timeSlotsNoturno];
		}
	} else {
		// Usar apenas um turno conforme a configuração
		if (isMatutino) {
			timeSlots = timeSlotsMatutino;
		} else if (isVespertino) {
			timeSlots = timeSlotsVespertino;
		} else {
			timeSlots = timeSlotsNoturno;
		}
	}

	// Rótulos de período para os chips
	let periodLabels = [];
	if (temMultiplosTurnos) {
		const turnos = getTurnosOferta(phaseNumber);
		if (turnos.includes("matutino")) {
			periodLabels.push({ label: "Matutino", color: "success" });
		}
		if (turnos.includes("vespertino")) {
			periodLabels.push({ label: "Vespertino", color: "warning" });
		}
		if (turnos.includes("noturno")) {
			periodLabels.push({ label: "Noturno", color: "primary" });
		}
	} else {
		let periodLabel, colorLabel;
		if (isMatutino) {
			periodLabel = "Matutino";
			colorLabel = "success";
		} else if (isVespertino) {
			periodLabel = "Vespertino";
			colorLabel = "warning";
		} else {
			periodLabel = "Noturno";
			colorLabel = "primary";
		}
		periodLabels.push({ label: periodLabel, color: colorLabel });
	}

	return (
		<Box sx={{ mb: 4 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
				<Typography variant="h6">{phaseNumber}ª Fase</Typography>
				{periodLabels.map((periodo, index) => (
					<Chip
						key={index}
						label={periodo.label}
						color={periodo.color}
						size="small"
					/>
				))}
				{temMultiplosTurnos && (
					<Typography
						variant="caption"
						sx={{
							ml: 1,
							fontStyle: "italic",
							color: "text.secondary",
						}}
					>
						{(() => {
							const turnos = getTurnosOferta(phaseNumber);
							let inicio = "",
								fim = "";

							if (turnos.includes("matutino")) {
								inicio = "07:30";
							}

							if (turnos.includes("noturno")) {
								fim = "22:30";
							} else if (turnos.includes("vespertino")) {
								fim = "18:00";
							} else if (
								turnos.includes("matutino") &&
								!turnos.includes("vespertino") &&
								!turnos.includes("noturno")
							) {
								fim = "12:00";
							}

							if (!inicio && turnos.includes("vespertino")) {
								inicio = "13:30";
							}
							if (
								!inicio &&
								turnos.includes("noturno") &&
								!turnos.includes("vespertino")
							) {
								inicio = "19:00";
							}

							return `(${inicio} às ${fim})`;
						})()}
					</Typography>
				)}
			</Box>

			<Box
				className="time-grid"
				sx={{
					display: "flex",
					border: `1px solid ${theme.palette.divider}`,
					borderRadius: 1,
					overflow: "hidden",
				}}
			>
				{/* Time column */}
				<Box
					sx={{
						width: "80px",
						borderRight: `1px solid ${theme.palette.divider}`,
						backgroundColor:
							theme.palette.mode === "dark"
								? "rgba(255, 255, 255, 0.05)"
								: "#fafafa",
					}}
				>
					<Box
						sx={{
							height: "40px",
							borderBottom: `1px solid ${theme.palette.divider}`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							backgroundColor:
								theme.palette.mode === "dark"
									? "rgba(255, 255, 255, 0.08)"
									: "#f0f0f0",
						}}
					>
						<Typography variant="caption" fontWeight="bold">
							Horário
						</Typography>
					</Box>
					{timeSlots.map((time, index) => {
						// Adicionar separador visual entre turnos
						const isFirstVespertino =
							temMultiplosTurnos &&
							time === timeSlotsVespertino[0];
						const isFirstNoturno =
							temMultiplosTurnos && time === timeSlotsNoturno[0];

						return (
							<Box
								key={time}
								sx={{
									height: "30px",
									borderBottom: `1px solid ${theme.palette.divider}`,
									borderTop:
										isFirstVespertino || isFirstNoturno
											? `2px dashed ${
													theme.palette.mode ===
													"dark"
														? "rgba(255, 255, 255, 0.3)"
														: "#bbb"
											  }`
											: "none",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "0.75rem",
									color: theme.palette.text.secondary,
									backgroundColor:
										isFirstVespertino || isFirstNoturno
											? theme.palette.mode === "dark"
												? "rgba(255, 255, 255, 0.05)"
												: "#f5f5f5"
											: "transparent",
								}}
							>
								{formatTimeForDisplay(time)}
							</Box>
						);
					})}
				</Box>

				{/* Days columns */}
				{daysOfWeek.map((day) => (
					<Box
						key={day.id}
						sx={{
							flex: 1,
							borderRight: `1px solid ${theme.palette.divider}`,
						}}
					>
						<Box
							sx={{
								height: "40px",
								borderBottom: `1px solid ${theme.palette.divider}`,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								backgroundColor:
									theme.palette.mode === "dark"
										? "rgba(255, 255, 255, 0.05)"
										: "#f5f5f5",
							}}
						>
							<Typography variant="subtitle2" fontWeight="bold">
								{day.title}
							</Typography>
						</Box>

						{timeSlots.map((time, index) => {
							// Adicionar separador visual entre turnos
							const isFirstVespertino =
								temMultiplosTurnos &&
								time === timeSlotsVespertino[0];
							const isFirstNoturno =
								temMultiplosTurnos &&
								time === timeSlotsNoturno[0];

							return (
								<TimeSlot
									key={`${day.id}-${time}`}
									time={time}
									dayId={day.id}
									events={events}
									onDropEvent={(eventData, dayId, time) =>
										onDropEvent(
											eventData,
											dayId,
											time,
											phaseNumber,
										)
									}
									onAddEvent={(dayId, time) =>
										onAddEvent(dayId, time, phaseNumber)
									}
									onResize={(eventId, newDuration) =>
										onResize(
											eventId,
											newDuration,
											phaseNumber,
										)
									}
									onEdit={(event) =>
										onEdit(event, phaseNumber)
									}
									onDelete={(eventId) =>
										onDelete(eventId, phaseNumber)
									}
									timeSlots={timeSlots}
									professores={professores}
									verificarSeEventoTemConflito={
										verificarSeEventoTemConflito
									}
									obterConflitosDoEvento={
										obterConflitosDoEvento
									}
									sx={
										isFirstVespertino || isFirstNoturno
											? {
													borderTop: `2px dashed ${
														theme.palette.mode ===
														"dark"
															? "rgba(255, 255, 255, 0.3)"
															: "#bbb"
													}`,
													backgroundColor:
														theme.palette.mode ===
														"dark"
															? "rgba(255, 255, 255, 0.05)"
															: "#f5f5f5",
											  }
											: {}
									}
								/>
							);
						})}
					</Box>
				))}
			</Box>
		</Box>
	);
};

// Adicionar estilo para animação de pulsação
const pulseKeyframes = `
    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.1);
            opacity: 0.8;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
`;

// Adicionar o estilo ao document head se ainda não existir
if (!document.getElementById("conflict-badge-styles")) {
	const style = document.createElement("style");
	style.id = "conflict-badge-styles";
	style.textContent = pulseKeyframes;
	document.head.appendChild(style);
}

export default function Horarios() {
	const { permissoesUsuario } = useAuth();
	const canManageHorarios =
		permissoesService.verificarPermissaoPorId(
			permissoesUsuario,
			Permissoes.HORARIOS.CRIAR,
		) &&
		permissoesService.verificarPermissaoPorId(
			permissoesUsuario,
			Permissoes.HORARIOS.EDITAR,
		);
	const [selectedAnoSemestre, setSelectedAnoSemestre] = useState({
		ano: new Date().getFullYear(),
		semestre: 1,
	});
	const [selectedCurso, setSelectedCurso] = useState(null); // Novo estado para curso selecionado
	const [cursos, setCursos] = useState([]); // Novo estado para lista de cursos
	const [loadingCursos, setLoadingCursos] = useState(true); // Loading para cursos
	const [errorCursos, setErrorCursos] = useState(null); // Error para cursos
	const [events, setEvents] = useState(initialEvents);
	const [modalOpen, setModalOpen] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState(null);
	const [selectedPhase, setSelectedPhase] = useState(null);
	const [originalEventBackup, setOriginalEventBackup] = useState(null); // Backup do evento original
	const [professores, setProfessores] = useState([]);
	const [loadingProfessores, setLoadingProfessores] = useState(true);
	const [errorProfessores, setErrorProfessores] = useState(null);
	const [disciplinas, setDisciplinas] = useState([]);
	const [loadingDisciplinas, setLoadingDisciplinas] = useState(true);
	const [errorDisciplinas, setErrorDisciplinas] = useState(null);
	const [savingHorarios, setSavingHorarios] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [saveError, setSaveError] = useState(null);
	const [loadingHorarios, setLoadingHorarios] = useState(false);
	const [loadError, setLoadError] = useState(null);
	const [originalHorarios, setOriginalHorarios] = useState([]);
	const [anosSemestres, setAnosSemestres] = useState([]);
	const [loadingAnosSemestres, setLoadingAnosSemestres] = useState(true);
	const [errorAnosSemestres, setErrorAnosSemestres] = useState(null);
	const [hasAutoSelectedAnoSemestre, setHasAutoSelectedAnoSemestre] =
		useState(false);
	const [conflitosHorarios, setConflitosHorarios] = useState([]);
	const [showConflitos, setShowConflitos] = useState(false);
	const [ofertas, setOfertas] = useState([]);
	const [loadingOfertas, setLoadingOfertas] = useState(true);
	const [errorOfertas, setErrorOfertas] = useState(null);
	const [snackbarMessage, setSnackbarMessage] = useState("");
	const [snackbarOpen, setSnackbarOpen] = useState(false);
	const [showReloadConfirmation, setShowReloadConfirmation] = useState(false);

	// Modal de importação de horários
	const [showImportModal, setShowImportModal] = useState(false);
	const [importLoading, setImportLoading] = useState(false);
	const [importError, setImportError] = useState(null);
	const [incluirDocentes, setIncluirDocentes] = useState(false);
	const [incluirOfertas, setIncluirOfertas] = useState(false);
	const [selectedAnoSemestreOrigem, setSelectedAnoSemestreOrigem] =
		useState(null);

	// Drawer lateral: Créditos por docente
	const [openCreditosDrawer, setOpenCreditosDrawer] = useState(false);

	// Estado para armazenar créditos do semestre atual por docente
	const creditosSemestreAtualPorDocente = useMemo(() => {
		// Estrutura: { codigoDocente: totalCreditosNoSemestreAtual }
		const mapa = new Map();
		if (!events || !disciplinas || disciplinas.length === 0) return mapa;

		// Índice de créditos por CCR
		const creditosPorCcr = new Map(
			disciplinas.map((d) => [String(d.id), Number(d.creditos) || 0]),
		);

		// Evitar contar o mesmo CCR mais de uma vez por docente no mesmo turno do semestre
		const vistos = new Set(); // chave: `${docente}-${ccr}-${turno}`

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
					// Pode ter múltiplos professores
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
	}, [events, disciplinas]);

	// Busca do outro semestre no mesmo ano para média anual
	const [creditosOutroSemestre, setCreditosOutroSemestre] = useState(
		new Map(),
	);
	useEffect(() => {
		const carregarOutroSemestre = async () => {
			try {
				if (!selectedCurso?.id || !selectedAnoSemestre?.ano) {
					setCreditosOutroSemestre(new Map());
					return;
				}
				const outroSemestre =
					selectedAnoSemestre.semestre === 1 ? 2 : 1;
				// Buscar horários do outro semestre para o mesmo ano/curso
				const resp = await axiosInstance.get("/horarios", {
					params: {
						ano: selectedAnoSemestre.ano,
						semestre: outroSemestre,
						id_curso: selectedCurso.id,
					},
				});
				const horarios = resp.horarios || [];
				// Índice de créditos por CCR
				const creditosPorCcr = new Map(
					disciplinas.map((d) => [
						String(d.id),
						Number(d.creditos) || 0,
					]),
				);
				const mapa = new Map();
				const vistos = new Set(); // `${docente}-${ccr}-${turno}` para o outro semestre
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
				setCreditosOutroSemestre(mapa);
			} catch (e) {
				console.error(
					"Erro ao carregar créditos do outro semestre:",
					e,
				);
				setCreditosOutroSemestre(new Map());
			}
		};

		carregarOutroSemestre();
	}, [selectedCurso, selectedAnoSemestre, disciplinas]);

	// Linhas da tabela: docente, créditos no semestre atual, média anual
	const linhasCreditos = useMemo(() => {
		// Apenas docentes que possuem horários no semestre atual
		const docentesKeys = new Set(
			Array.from(creditosSemestreAtualPorDocente.keys()),
		);
		// Mapear para exibição
		const docentesMap = new Map(
			professores.map((p) => [String(p.codigo || p.id), p]),
		);
		const linhas = Array.from(docentesKeys).map((cod) => {
			const atual = creditosSemestreAtualPorDocente.get(String(cod)) || 0;
			const outro = creditosOutroSemestre.get(String(cod)) || 0;
			const numSemestres = (atual > 0 ? 1 : 0) + (outro > 0 ? 1 : 0);
			const mediaAnual =
				numSemestres > 0 ? (atual + outro) / numSemestres : 0;
			const prof = docentesMap.get(String(cod));
			return {
				codigo: String(cod),
				nome: prof?.name || prof?.nome || String(cod),
				creditosSemestre: atual,
				mediaAnual,
			};
		});
		// Ordenar por nome
		linhas.sort((a, b) => a.nome.localeCompare(b.nome));
		return linhas;
	}, [creditosSemestreAtualPorDocente, creditosOutroSemestre, professores]);

	// Helper para verificar se o semestre é par (para compatibilidade)
	const isEvenSemester = selectedAnoSemestre.semestre === 2;

	// Função para obter o ID do usuário atual
	// TODO: Substituir por sistema de autenticação real
	const getCurrentUserId = () => {
		return "gian"; // Usuário de teste
	};

	// Função para buscar cursos da API (apenas cursos vinculados ao usuário)
	const fetchCursos = async () => {
		try {
			setLoadingCursos(true);
			setErrorCursos(null);

			const userId = getCurrentUserId();

			const response = await axiosInstance.get(
				`/usuarios/${userId}/cursos`,
			);

			const cursosData = response.cursos || [];
			setCursos(cursosData);

			// Se não há curso selecionado e há cursos disponíveis, selecionar o primeiro
			if (!selectedCurso && cursosData.length > 0) {
				setSelectedCurso(cursosData[0]);
			}
		} catch (error) {
			console.error("Erro ao buscar cursos do usuário:", error);
			if (error.response?.status === 404) {
				setErrorCursos(
					"Usuário não encontrado ou sem cursos vinculados.",
				);
			} else {
				setErrorCursos(
					"Erro ao carregar cursos disponíveis para o usuário.",
				);
			}
			setCursos([]);
		} finally {
			setLoadingCursos(false);
		}
	};

	// Função para buscar anos/semestres da API
	const fetchAnosSemestres = async () => {
		try {
			setLoadingAnosSemestres(true);
			setErrorAnosSemestres(null);
			const response = await axiosInstance.get("/ano-semestre");

			const anosSemestresData = response.anosSemestres || [];
			setAnosSemestres(anosSemestresData);
		} catch (error) {
			console.error("Erro ao buscar anos/semestres:", error);
			setErrorAnosSemestres(
				"Erro ao carregar anos/semestres disponíveis.",
			);
			setAnosSemestres([]);
		} finally {
			setLoadingAnosSemestres(false);
		}
	};

	// Auto-selecionar período conforme regra: mais recente rascunho; senão, mais recente com horários
	useEffect(() => {
		const autoSelect = async () => {
			if (hasAutoSelectedAnoSemestre) return;
			if (!Array.isArray(anosSemestres) || anosSemestres.length === 0)
				return;
			if (!selectedCurso || !selectedCurso.id) return;

			// 1) Mais recente como rascunho (publicado === false)
			const draft = anosSemestres.find((as) => as.publicado === false);
			if (draft) {
				// Se o draft é anterior ao ano/semestre atual, priorizar o período atual (mesmo que publicado)
				const now = new Date();
				const currentAno = now.getFullYear();
				const currentSemestre = now.getMonth() < 6 ? 1 : 2;
				const draftIsBeforeCurrent =
					draft.ano < currentAno ||
					(draft.ano === currentAno && draft.semestre < currentSemestre);

				if (draftIsBeforeCurrent) {
					const existsCurrent = anosSemestres.some(
						(as) => as.ano === currentAno && as.semestre === currentSemestre,
					);
					if (existsCurrent) {
						setSelectedAnoSemestre({
							ano: currentAno,
							semestre: currentSemestre,
						});
						setHasAutoSelectedAnoSemestre(true);
						return;
					}
					// Se o atual não existe no cadastro, seguir fluxo normal abaixo
				} else {
					setSelectedAnoSemestre({ ano: draft.ano, semestre: draft.semestre });
					setHasAutoSelectedAnoSemestre(true);
					return;
				}
			}

			// 2) Mais recente com horários cadastrados para o curso selecionado
			try {
				const results = await Promise.all(
					anosSemestres.map(async (as) => {
						try {
							const resp = await axiosInstance.get("/horarios", {
								params: {
									ano: as.ano,
									semestre: as.semestre,
									id_curso: selectedCurso.id,
								},
							});
							const count =
								resp?.count ?? (Array.isArray(resp?.horarios) ? resp.horarios.length : 0);
							return { as, count };
						} catch (_) {
							return { as, count: 0 };
						}
					}),
				);

				const found = results.find((r) => r.count > 0);
				if (found) {
					setSelectedAnoSemestre({
						ano: found.as.ano,
						semestre: found.as.semestre,
					});
				} else {
					// 3) Nenhum com horários: selecionar o mais recente da lista
					const first = anosSemestres[0];
					setSelectedAnoSemestre({ ano: first.ano, semestre: first.semestre });
				}
			} finally {
				setHasAutoSelectedAnoSemestre(true);
			}
		};

		autoSelect();
	}, [anosSemestres, selectedCurso, hasAutoSelectedAnoSemestre]);

	// Função para buscar professores da API
	const fetchProfessores = async () => {
		try {
			setLoadingProfessores(true);
			setErrorProfessores(null);
			const response = await axiosInstance.get("/docentes");

			// Mapear dados da API para o formato esperado pelo frontend
			const professoresFormatados = response.docentes.map((prof) => ({
				id: prof.codigo, // Usar codigo como id
				codigo: prof.codigo,
				name: prof.nome, // Mapear nome para name
				email: prof.email,
				sala: prof.sala,
			}));

			setProfessores(professoresFormatados);
		} catch (error) {
			console.error("Erro ao buscar professores:", error);
			setErrorProfessores(
				"Erro ao carregar professores. Usando dados locais.",
			);
		} finally {
			setLoadingProfessores(false);
		}
	};

	// Função para buscar disciplinas (CCRs) da API
	const fetchDisciplinas = async () => {
		try {
			setLoadingDisciplinas(true);
			setErrorDisciplinas(null);
			const response = await axiosInstance.get("/ccrs");
			// Espera-se que a resposta seja { ccrs: [...] }
			const disciplinas = response.ccrs || [];

			const uniqueDisciplinas = getUniqueDisciplinas(disciplinas);

			setDisciplinas(disciplinas);
		} catch (error) {
			console.error("Erro ao buscar disciplinas:", error);
			setErrorDisciplinas("Erro ao carregar disciplinas.");
			setDisciplinas([]);
		} finally {
			setLoadingDisciplinas(false);
		}
	};

	// Função para buscar ofertas da API
	const fetchOfertas = async () => {
		try {
			setLoadingOfertas(true);
			setErrorOfertas(null);

			// Fazer requisição com filtros se há ano/semestre e curso selecionados
			const params = {};
			if (
				selectedAnoSemestre.ano &&
				selectedAnoSemestre.semestre &&
				selectedCurso?.id
			) {
				params.ano = selectedAnoSemestre.ano;
				params.semestre = selectedAnoSemestre.semestre;
				params.id_curso = selectedCurso.id;
			} else if (selectedCurso?.id) {
				// Se só tem curso selecionado, usar apenas ele
				params.id_curso = selectedCurso.id;
			}

			const response = await axiosInstance.get("/ofertas", {
				params,
			});

			const ofertasData = response.ofertas || [];
			setOfertas(ofertasData);
		} catch (error) {
			console.error("Erro ao buscar ofertas:", error);
			setErrorOfertas(
				"Erro ao carregar ofertas. Usando lógica padrão de turnos.",
			);
			setOfertas([]);
		} finally {
			setLoadingOfertas(false);
		}
	};

	// Função para converter horário string para minutos desde meia-noite
	const timeToMinutes = (timeStr) => {
		if (!timeStr || typeof timeStr !== "string") {
			return 0;
		}

		const parts = timeStr.split(":");
		if (parts.length < 2) {
			return 0;
		}

		const hours = parseInt(parts[0], 10);
		const minutes = parseInt(parts[1], 10);
		// Ignorar segundos se existirem

		if (
			isNaN(hours) ||
			isNaN(minutes) ||
			hours < 0 ||
			hours > 23 ||
			minutes < 0 ||
			minutes > 59
		) {
			return 0;
		}

		return hours * 60 + minutes;
	};

	// Função para verificar se dois horários se sobrepõem
	const horariosSeOverlapam = (horario1, horario2) => {
		// Validações básicas
		if (!horario1?.hora_inicio || !horario2?.hora_inicio) {
			return false;
		}

		if (!horario1?.duracao || !horario2?.duracao) {
			return false;
		}

		// Normalizar horas para string formato HH:MM:SS
		let hora1 = normalizeTimeFromDB(horario1.hora_inicio);
		let hora2 = normalizeTimeFromDB(horario2.hora_inicio);

		const inicio1 = timeToMinutes(hora1);
		const fim1 = inicio1 + horario1.duracao * 30; // Cada slot = 30 min

		const inicio2 = timeToMinutes(hora2);
		const fim2 = inicio2 + horario2.duracao * 30;

		// Validar se os valores são válidos
		if (isNaN(inicio1) || isNaN(fim1) || isNaN(inicio2) || isNaN(fim2)) {
			return false;
		}

		// Verifica se há sobreposição REAL (não apenas toque)
		// Dois horários se sobrepõem APENAS se há sobreposição temporal real
		// NÃO consideramos "toque" (quando um termina exatamente quando outro começa) como conflito
		// Exemplo: 19:00-21:00 e 21:00-23:00 NÃO devem ser considerados conflito
		const hasOverlap = inicio1 < fim2 && inicio2 < fim1;

		// Verificação adicional para garantir que eventos adjacentes não sejam considerados conflitos
		// Se um evento termina exatamente quando outro começa, não há conflito
		if (fim1 === inicio2 || fim2 === inicio1) {
			return false;
		}

		return hasOverlap;
	};

	// Função para verificar se um evento específico tem conflitos
	const verificarSeEventoTemConflito = (evento) => {
		if (!evento || !conflitosHorarios || conflitosHorarios.length === 0) {
			return false;
		}

		const professoresDoEvento =
			evento.professoresIds && Array.isArray(evento.professoresIds)
				? evento.professoresIds.map(String)
				: evento.professorId
				? [String(evento.professorId)]
				: [];

		// Não mostrar conflitos para eventos sem disciplina definida
		if (
			professoresDoEvento.length === 0 ||
			!evento.disciplinaId ||
			!evento.startTime ||
			!evento.dayId
		) {
			return false;
		}

		const diaEvento = dayToNumber[evento.dayId];

		// Verificar se algum dos professores do evento está em conflito
		return conflitosHorarios.some((conflito) => {
			const professorMatch = professoresDoEvento.includes(
				String(conflito.codigoProfessor),
			);

			if (!professorMatch || conflito.dia != diaEvento) {
				return false;
			}

			// Adaptar o evento atual para o formato esperado pela função de overlap
			const eventoAdaptado = {
				hora_inicio: normalizeTimeFromDB(evento.startTime),
				duracao: evento.duration || 2,
			};

			const horario1Adaptado = {
				hora_inicio: normalizeTimeFromDB(conflito.horario1.hora_inicio),
				duracao: conflito.horario1.duracao,
			};

			const horario2Adaptado = {
				hora_inicio: normalizeTimeFromDB(conflito.horario2.hora_inicio),
				duracao: conflito.horario2.duracao,
			};

			return (
				horariosSeOverlapam(eventoAdaptado, horario1Adaptado) ||
				horariosSeOverlapam(eventoAdaptado, horario2Adaptado)
			);
		});
	};

	// Função para obter conflitos específicos de um evento
	const obterConflitosDoEvento = (evento) => {
		if (!evento || !conflitosHorarios || conflitosHorarios.length === 0) {
			return [];
		}

		const professoresDoEvento =
			evento.professoresIds && Array.isArray(evento.professoresIds)
				? evento.professoresIds.map(String)
				: evento.professorId
				? [String(evento.professorId)]
				: [];

		// Não retornar conflitos para eventos sem disciplina definida
		if (
			professoresDoEvento.length === 0 ||
			!evento.disciplinaId ||
			!evento.startTime ||
			!evento.dayId
		) {
			return [];
		}

		const diaEvento = dayToNumber[evento.dayId];

		return conflitosHorarios.filter((conflito) => {
			const professorMatch = professoresDoEvento.includes(
				String(conflito.codigoProfessor),
			);

			if (!professorMatch || conflito.dia != diaEvento) {
				return false;
			}

			const eventoAdaptado = {
				hora_inicio: normalizeTimeFromDB(evento.startTime),
				duracao: evento.duration || 2,
			};

			const horario1Adaptado = {
				hora_inicio: normalizeTimeFromDB(conflito.horario1.hora_inicio),
				duracao: conflito.horario1.duracao,
			};

			const horario2Adaptado = {
				hora_inicio: normalizeTimeFromDB(conflito.horario2.hora_inicio),
				duracao: conflito.horario2.duracao,
			};

			return (
				horariosSeOverlapam(eventoAdaptado, horario1Adaptado) ||
				horariosSeOverlapam(eventoAdaptado, horario2Adaptado)
			);
		});
	};

	// Função para verificar conflitos de um professor específico em tempo real
	const verificarConflitoProfessor = async (
		codigoProfessor,
		novoEvento = null,
	) => {
		try {
			// Ignorar verificação de conflitos para professor sem.professor
			if (codigoProfessor === "sem.professor") {
				return [];
			}

			const conflitos = [];
			const conflitosSet = new Set(); // Para evitar duplicatas absolutas

			// 1. Buscar horários salvos no banco para este professor
			const allHorariosResponse = await Promise.all(
				anosSemestres.map(async (anoSem) => {
					try {
						const response = await axiosInstance.get("/horarios", {
							params: {
								ano: anoSem.ano,
								semestre: anoSem.semestre,
								id_curso: 1,
							},
						});
						return response.horarios || [];
					} catch (error) {
						return [];
					}
				}),
			);

			const horariosSalvos = allHorariosResponse
				.flat()
				.filter((h) => h.codigo_docente === codigoProfessor)
				.map((h) => ({
					...h,
					uniqueKey: `salvo-${h.id}`,
					eventoId: h.id,
					tipo: "salvo",
				}));

			// 2. Coletar horários temporários (não salvos) deste professor
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
								});
							}
						});
					});
				}
			});

			// 3. Se há um novo evento sendo criado/editado, substituir o temporário existente
			if (
				novoEvento &&
				(novoEvento.professoresIds?.includes(codigoProfessor) ||
					novoEvento.professorId === codigoProfessor)
			) {
				// Remover o horário temporário existente do mesmo evento (se existir)
				const indexExistente = horariosTemporarios.findIndex(
					(h) => h.eventoId === novoEvento.id,
				);
				if (indexExistente >= 0) {
					horariosTemporarios.splice(indexExistente, 1);
				}

				// Adicionar o novo evento atualizado
				horariosTemporarios.push({
					codigo_docente: codigoProfessor,
					dia_semana: dayToNumber[novoEvento.dayId],
					hora_inicio: novoEvento.startTime,
					duracao: novoEvento.duration || 2,
					ano: selectedAnoSemestre.ano,
					semestre: selectedAnoSemestre.semestre,
					id_ccr: novoEvento.disciplinaId,
					disciplinaNome: novoEvento.title,
					tipo: "novo",
					eventoId: novoEvento.id,
					uniqueKey: `novo-${novoEvento.id}`,
				});
			}

			// 4. Combinar todos os horários
			const todosHorarios = [...horariosSalvos, ...horariosTemporarios];

			// 5. Criar mapa de eventos únicos por ID para evitar comparação do mesmo evento
			const eventosUnicos = new Map();
			todosHorarios.forEach((horario) => {
				const eventoId = horario.eventoId || horario.id;
				if (eventoId) {
					// Se já existe um evento com este ID, manter apenas o mais recente (novo > temporario > salvo)
					const prioridade =
						horario.tipo === "novo"
							? 3
							: horario.tipo === "temporario"
							? 2
							: 1;
					const existente = eventosUnicos.get(eventoId);

					if (!existente || prioridade > existente.prioridade) {
						eventosUnicos.set(eventoId, { ...horario, prioridade });
					}
				} else {
					// Se não tem ID, usar chave única baseada em propriedades
					const chaveUnica = `${horario.id_ccr}-${horario.dia_semana}-${horario.hora_inicio}-${horario.duracao}-${horario.ano}-${horario.semestre}`;
					if (!eventosUnicos.has(chaveUnica)) {
						eventosUnicos.set(chaveUnica, horario);
					}
				}
			});

			// 6. Converter de volta para array e agrupar por dia
			const horariosFinais = Array.from(eventosUnicos.values());
			const horariosPorDia = {};
			horariosFinais.forEach((horario) => {
				const dia = horario.dia_semana;
				if (!horariosPorDia[dia]) {
					horariosPorDia[dia] = [];
				}
				horariosPorDia[dia].push(horario);
			});

			// 7. Verificar conflitos entre eventos diferentes
			Object.entries(horariosPorDia).forEach(([dia, horariosNoDia]) => {
				// Ordenar por hora para garantir comparação consistente
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

						// CRÍTICO: Nunca comparar o mesmo evento consigo mesmo
						const evento1Id = h1.eventoId || h1.id;
						const evento2Id = h2.eventoId || h2.id;

						if (evento1Id && evento2Id && evento1Id === evento2Id) {
							continue; // Pular comparação do mesmo evento
						}

						// IMPORTANTE: Só detectar conflitos entre horários do MESMO ano e semestre
						if (h1.ano !== h2.ano || h1.semestre !== h2.semestre) {
							continue; // Horários de períodos diferentes não são conflitos
						}

						// Verificar se são exatamente o mesmo horário (mesmo professor, disciplina, dia, hora)
						const hora1 =
							typeof h1.hora_inicio === "object"
								? h1.hora_inicio.toString().substring(0, 5)
								: h1.hora_inicio;
						const hora2 =
							typeof h2.hora_inicio === "object"
								? h2.hora_inicio.toString().substring(0, 5)
								: h2.hora_inicio;

						if (
							h1.id_ccr === h2.id_ccr &&
							hora1 === hora2 &&
							h1.duracao === h2.duracao &&
							h1.ano === h2.ano &&
							h1.semestre === h2.semestre &&
							h1.codigo_docente === h2.codigo_docente
						) {
							continue; // São o mesmo horário, não é conflito
						}

						// Verificar se algum dos eventos permite conflito
						if (h1.permitirConflito || h2.permitirConflito) {
							continue; // Pular se algum evento permitir conflito
						}

						// Verificar sobreposição temporal
						if (horariosSeOverlapam(h1, h2)) {
							// Criar ID único determinístico para o conflito
							const conflict1 = `${h1.id_ccr || "null"}-${
								h1.ano
							}-${h1.semestre}-${hora1}-${h1.duracao}`;
							const conflict2 = `${h2.id_ccr || "null"}-${
								h2.ano
							}-${h2.semestre}-${hora2}-${h2.duracao}`;
							const sortedConflicts = [
								conflict1,
								conflict2,
							].sort();
							const conflictId = `${codigoProfessor}-${dia}-${sortedConflicts.join(
								"---",
							)}`;

							// Verificar se já processamos este conflito
							if (conflitosSet.has(conflictId)) {
								continue;
							}
							conflitosSet.add(conflictId);

							const disciplina1 = disciplinas.find(
								(d) => d.id === h1.id_ccr,
							);
							const disciplina2 = disciplinas.find(
								(d) => d.id === h2.id_ccr,
							);

							conflitos.push({
								id: conflictId,
								professor:
									professores.find(
										(p) => p.codigo === codigoProfessor,
									)?.name || codigoProfessor,
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
										disciplina1?.nome ||
										"Disciplina não encontrada",
									hora_inicio: hora1,
									ano_semestre: `${h1.ano}/${h1.semestre}`,
									tipo: h1.tipo || "salvo",
								},
								horario2: {
									...h2,
									disciplinaNome:
										h2.disciplinaNome ||
										disciplina2?.nome ||
										"Disciplina não encontrada",
									hora_inicio: hora2,
									ano_semestre: `${h2.ano}/${h2.semestre}`,
									tipo: h2.tipo || "salvo",
								},
							});
						}
					}
				}
			});

			return conflitos;
		} catch (error) {
			console.error(
				`Erro ao verificar conflitos para professor ${codigoProfessor}:`,
				error,
			);
			return [];
		}
	};

	// Função para detectar conflitos de horários entre professores
	const detectarConflitosHorarios = async () => {
		try {
			// Log removido
			setConflitosHorarios([]);

			// Coletar todos os professores únicos dos eventos atuais E dos salvos
			const professoresComHorarios = new Set();

			// Professores dos eventos temporários (na tela)
			Object.keys(events).forEach((phaseNumber) => {
				const phaseEvents = events[phaseNumber];
				if (phaseEvents) {
					Object.values(phaseEvents).forEach((eventArray) => {
						const eventsInSlot = Array.isArray(eventArray)
							? eventArray
							: [eventArray];
						eventsInSlot.forEach((event) => {
							// Só considerar eventos que têm disciplina definida
							if (event.disciplinaId) {
								if (
									event.professoresIds &&
									Array.isArray(event.professoresIds)
								) {
									event.professoresIds.forEach((profId) => {
										if (profId !== "sem.professor") {
											professoresComHorarios.add(profId);
										}
									});
								} else if (
									event.professorId &&
									event.professorId !== "sem.professor"
								) {
									professoresComHorarios.add(
										event.professorId,
									);
								}
							}
						});
					});
				}
			});

			// Log removido

			const conflitos = [];
			const conflitosProcessados = new Set(); // Para evitar conflitos duplicados globalmente

			// Para cada professor, buscar todos os seus horários em todos os anos/semestres
			for (const codigoProfessor of professoresComHorarios) {
				// Ignorar verificação de conflitos para professor sem.professor
				if (codigoProfessor !== "sem.professor") {
					try {
						// Log removido
						// Buscar horários em todos os anos/semestres para este professor
						const allHorariosResponse = await Promise.all(
							anosSemestres.map(async (anoSem) => {
								try {
									const response = await axiosInstance.get(
										"/horarios",
										{
											params: {
												ano: anoSem.ano,
												semestre: anoSem.semestre,
												id_curso:
													selectedCurso?.id || 1,
											},
										},
									);
									return response.horarios || [];
								} catch (error) {
									console.warn(
										`Erro ao buscar horários para ${anoSem.ano}/${anoSem.semestre}:`,
										error,
									);
									return [];
								}
							}),
						);

						// Flatten e filtrar horários salvos
						const horariosSalvos = allHorariosResponse
							.flat()
							.filter(
								(h) =>
									h.codigo_docente === codigoProfessor &&
									h.id_ccr &&
									!h.permitirConflito, // Ignorar horários que permitem conflito
							) // Filtrar apenas horários com disciplina
							.map((h) => ({
								...h,
								uniqueKey: `salvo-${h.id}`,
								eventoId: h.id,
								tipo: "salvo",
							}));

						// Coletar horários temporários APENAS para eventos não salvos ou que foram modificados
						const horariosTemporarios = [];
						Object.keys(events).forEach((phaseNumber) => {
							const phaseEvents = events[phaseNumber];
							if (phaseEvents) {
								Object.values(phaseEvents).forEach(
									(eventArray) => {
										const eventsInSlot = Array.isArray(
											eventArray,
										)
											? eventArray
											: [eventArray];
										eventsInSlot.forEach((event) => {
											const professoresDoEvento =
												event.professoresIds &&
												Array.isArray(
													event.professoresIds,
												)
													? event.professoresIds
													: event.professorId
													? [event.professorId]
													: [];

											if (
												professoresDoEvento.includes(
													codigoProfessor,
												)
											) {
												// Verificar se este evento temporário já existe como horário salvo
												const jaExisteNoSalvo =
													horariosSalvos.some(
														(salvo) => {
															return (
																salvo.id_ccr ===
																	event.disciplinaId &&
																salvo.dia_semana ===
																	dayToNumber[
																		event
																			.dayId
																	] &&
																salvo.hora_inicio ===
																	event.startTime &&
																// Nota: ignoramos duração para evitar conflito falso quando apenas
																// o tamanho da aula é alterado antes de sincronizar com o banco.
																salvo.codigo_docente ===
																	codigoProfessor &&
																salvo.ano ===
																	selectedAnoSemestre.ano &&
																salvo.semestre ===
																	selectedAnoSemestre.semestre
															);
														},
													);

												// Só adicionar se não existir como salvo (evento realmente novo/modificado) E tem disciplina definida E não permite conflito
												if (
													!jaExisteNoSalvo &&
													event.disciplinaId &&
													!event.permitirConflito
												) {
													horariosTemporarios.push({
														codigo_docente:
															codigoProfessor,
														dia_semana:
															dayToNumber[
																event.dayId
															],
														hora_inicio:
															event.startTime,
														duracao:
															event.duration || 2,
														ano: selectedAnoSemestre.ano,
														semestre:
															selectedAnoSemestre.semestre,
														id_ccr: event.disciplinaId,
														disciplinaNome:
															event.title,
														tipo: "temporario",
														eventoId: event.id,
														uniqueKey: `temp-${event.id}`,
														permitirConflito:
															event.permitirConflito ||
															false,
													});
												}
											}
										});
									},
								);
							}
						});

						// Combinar todos os horários
						const todosHorarios = [
							...horariosSalvos,
							...horariosTemporarios,
						];

						// Criar mapa de eventos únicos com MÚLTIPLAS CHAVES para evitar duplicatas
						const eventosUnicos = new Map();
						const chavesDuplicacao = new Set();

						todosHorarios.forEach((horario) => {
							// Normalizar hora_inicio
							let horaInicio = horario.hora_inicio;
							if (typeof horaInicio === "object") {
								horaInicio = horaInicio
									.toString()
									.substring(0, 5);
							}
							if (horaInicio && horaInicio.includes(":")) {
								horaInicio = horaInicio
									.split(":")
									.slice(0, 2)
									.join(":");
							}

							// Criar chave única ultra-específica
							const chaveCompleta = `${codigoProfessor}-${horario.id_ccr}-${horario.dia_semana}-${horaInicio}-${horario.duracao}-${horario.ano}-${horario.semestre}`;

							// Se já existe essa chave exata, pular (evitar duplicatas absolutas)
							if (chavesDuplicacao.has(chaveCompleta)) {
								return;
							}
							chavesDuplicacao.add(chaveCompleta);

							const eventoId = horario.eventoId || horario.id;
							if (eventoId) {
								// Se já existe um evento com este ID, manter apenas o mais recente (novo > temporario > salvo)
								const prioridade =
									horario.tipo === "novo"
										? 3
										: horario.tipo === "temporario"
										? 2
										: 1;
								const existente = eventosUnicos.get(eventoId);

								if (
									!existente ||
									prioridade > existente.prioridade
								) {
									eventosUnicos.set(eventoId, {
										...horario,
										prioridade,
										hora_inicio: horaInicio,
									});
								}
							} else {
								// Se não tem ID, usar a chave completa
								eventosUnicos.set(chaveCompleta, {
									...horario,
									hora_inicio: horaInicio,
								});
							}
						});

						// Converter de volta para array
						const horariosFinais = Array.from(
							eventosUnicos.values(),
						);
						// Log removido

						// Agrupar horários por dia da semana
						const horariosPorDia = {};
						horariosFinais.forEach((horario) => {
							const dia = horario.dia_semana;
							if (!horariosPorDia[dia]) {
								horariosPorDia[dia] = [];
							}
							horariosPorDia[dia].push(horario);
						});

						// Verificar conflitos dentro de cada dia
						Object.entries(horariosPorDia).forEach(
							([dia, horariosNoDia]) => {
								// Ordenar por hora para garantir comparação consistente
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
									for (
										let j = i + 1;
										j < horariosNoDia.length;
										j++
									) {
										const h1 = horariosNoDia[i];
										const h2 = horariosNoDia[j];

										// CRÍTICO: Nunca comparar o mesmo evento consigo mesmo
										const evento1Id = h1.eventoId || h1.id;
										const evento2Id = h2.eventoId || h2.id;

										if (
											evento1Id &&
											evento2Id &&
											evento1Id === evento2Id
										) {
											continue; // Pular comparação do mesmo evento
										}

										// IMPORTANTE: Só detectar conflitos entre horários do MESMO ano e semestre
										if (
											h1.ano !== h2.ano ||
											h1.semestre !== h2.semestre
										) {
											continue; // Horários de períodos diferentes não são conflitos
										}

										// Normalizar horários para comparação
										const hora1 =
											typeof h1.hora_inicio === "object"
												? h1.hora_inicio
														.toString()
														.substring(0, 5)
												: h1.hora_inicio;
										const hora2 =
											typeof h2.hora_inicio === "object"
												? h2.hora_inicio
														.toString()
														.substring(0, 5)
												: h2.hora_inicio;

										// Remover segundos se existirem
										const hora1Normalizada = hora1
											?.split(":")
											.slice(0, 2)
											.join(":");
										const hora2Normalizada = hora2
											?.split(":")
											.slice(0, 2)
											.join(":");

										// Verificar se na prática é o MESMO compromisso (ignora duração, pois
										// ela pode ter sido editada antes da sincronização).
										const saoOMesmoHorario =
											h1.id_ccr === h2.id_ccr &&
											hora1Normalizada ===
												hora2Normalizada &&
											h1.ano === h2.ano &&
											h1.semestre === h2.semestre &&
											h1.dia_semana === h2.dia_semana &&
											h1.codigo_docente ===
												h2.codigo_docente;

										if (saoOMesmoHorario) {
											continue; // São o mesmo horário, não é conflito
										}

										// Verificar se ambos os horários têm disciplinas e há sobreposição temporal
										if (
											h1.id_ccr &&
											h2.id_ccr &&
											horariosSeOverlapam(h1, h2)
										) {
											// Criar ID único determinístico baseado nas propriedades dos horários
											const conflict1 = `${h1.id_ccr}-${h1.ano}-${h1.semestre}-${hora1}-${h1.duracao}`;
											const conflict2 = `${h2.id_ccr}-${h2.ano}-${h2.semestre}-${hora2}-${h2.duracao}`;
											const sortedConflicts = [
												conflict1,
												conflict2,
											].sort();
											const conflictId = `${codigoProfessor}-${dia}-${sortedConflicts.join(
												"---",
											)}`;

											// Verificar se já processamos este conflito globalmente
											if (
												conflitosProcessados.has(
													conflictId,
												)
											) {
												continue;
											}
											conflitosProcessados.add(
												conflictId,
											);

											const professor = professores.find(
												(p) =>
													p.codigo ===
													codigoProfessor,
											);
											const disciplina1 =
												disciplinas.find(
													(d) => d.id === h1.id_ccr,
												);
											const disciplina2 =
												disciplinas.find(
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
															dayToNumber[
																d.id
															] === parseInt(dia),
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

											// Log removido
											conflitos.push(novoConflito);
										}
									}
								}
							},
						);
					} catch (error) {
						console.error(
							`Erro ao verificar conflitos para professor ${codigoProfessor}:`,
							error,
						);
					}
				}
			}

			// Log removido
			setConflitosHorarios(conflitos);
			return conflitos;
		} catch (error) {
			console.error("Erro ao detectar conflitos:", error);
			return [];
		}
	};

	// Função para salvar todos os horários no banco de dados
	const saveAllHorariosToDatabase = async () => {
		setSavingHorarios(true);
		setSaveError(null);
		setSaveSuccess(false);

		try {
			// 2.1. Montar lista de horários atuais
			const horariosAtuais = [];
			Object.keys(events).forEach((phaseNumber) => {
				const phaseEvents = events[phaseNumber];
				if (phaseEvents) {
					Object.values(phaseEvents).forEach((eventArray) => {
						const eventsInSlot = Array.isArray(eventArray)
							? eventArray
							: [eventArray];
						eventsInSlot.forEach((event) => {
							// Validar que tem disciplina e pelo menos um professor
							const hasProfessores =
								(event.professoresIds &&
									Array.isArray(event.professoresIds) &&
									event.professoresIds.length > 0) ||
								event.professorId;

							// CRITÉRIO OBRIGATÓRIO: Só sincronizar horários completos
							if (event.disciplinaId && hasProfessores) {
								// Se tem múltiplos professores, criar registro separado para cada um
								if (
									event.professoresIds &&
									Array.isArray(event.professoresIds)
								) {
									event.professoresIds.forEach(
										(professorId, index) => {
											// Para múltiplos professores, criar ID único apenas se necessário
											let uniqueId = event.id;
											if (
												event.professoresIds.length > 1
											) {
												// Se o ID já contém sufixo -prof, remover antes de adicionar novo
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
											// A fase será sempre a do grid onde está posicionado (phaseNumber)
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
									// Compatibilidade com formato antigo
									// A fase será sempre a do grid onde está posicionado (phaseNumber)
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

			// 2.2. Estratégia simplificada: substituir todos os horários
			// Para evitar problemas de diff complexo, vamos:
			// 1. Remover TODOS os horários originais
			// 2. Criar TODOS os horários atuais

			const novos = horariosAtuais; // Todos os atuais serão criados
			const editados = []; // Não fazemos edições, só recreação
			const removidos = originalHorarios; // Todos os originais serão removidos

			// 2.3. Fazer as requisições em ordem: primeiro remove, depois cria
			// Primeiro, remover todos os horários existentes
			for (const h of removidos) {
				await axiosInstance.delete(`/horarios/${h.id}`);
			}

			// Processar edições (se houver)
			for (const h of editados) {
				await axiosInstance.put(`/horarios/${h.id}`, h);
			}

			// Por último, criar todos os novos horários
			if (novos.length > 0) {
				await axiosInstance.post("/horarios/bulk", {
					horarios: novos,
				});
			}

			setSaveSuccess(true);
			setTimeout(() => setSaveSuccess(false), 3000);
			// Atualizar os originais para refletir o novo estado
			setOriginalHorarios(horariosAtuais);

			// Verificar conflitos após salvar
			await detectarConflitosHorarios();
		} catch (error) {
			setSaveError(
				error.response?.data?.message ||
					"Erro ao salvar horários. Tente novamente.",
			);
			setTimeout(() => setSaveError(null), 5000);
		} finally {
			setSavingHorarios(false);
		}
	};

	// Função para obter a fase do banco para posicionamento inicial na tela
	const getInitialPhaseFromDatabase = (dbEvent) => {
		// Usar a fase do banco para posicionamento inicial, mas depois será controlada pela interface
		return dbEvent.fase || 1; // Fase padrão se não especificada
	};

	// Função para lidar com o clique do botão recarregar
	// Verifica se há mudanças pendentes e solicita confirmação se necessário
	const handleReloadClick = () => {
		if (hasPendingChanges()) {
			setShowReloadConfirmation(true);
		} else {
			reloadAllData();
		}
	};

	// Função para recarregar todos os dados (professores, disciplinas, ofertas e horários)
	const reloadAllData = async () => {
		try {
			setLoadingHorarios(true);
			setLoadError(null);

			// Recarregar todos os dados em paralelo
			await Promise.all([
				fetchProfessores(),
				fetchDisciplinas(),
				fetchOfertas(),
			]);

			// Depois recarregar os horários
			await loadHorariosFromDatabase();
		} catch (error) {
			console.error("Erro ao recarregar todos os dados:", error);
			setLoadError("Erro ao recarregar dados. Tente novamente.");
		} finally {
			setLoadingHorarios(false);
		}
	};

	// Função para sincronizar mudanças e depois recarregar
	const handleSyncAndReload = async () => {
		try {
			await saveAllHorariosToDatabase();
			setShowReloadConfirmation(false);
			// Aguardar um pouco para garantir que a sincronização foi processada
			setTimeout(() => {
				reloadAllData(); // Recarregar todos os dados
			}, 500);
		} catch (error) {
			console.error("Erro ao sincronizar antes de recarregar:", error);
			setSnackbarMessage("Erro ao sincronizar. Tente novamente.");
			setSnackbarOpen(true);
			setShowReloadConfirmation(false);
		}
	};

	// Função para recarregar dados do banco de dados
	// Recarrega ofertas e horários salvos
	const loadHorariosFromDatabase = async () => {
		setLoadingHorarios(true);
		setLoadError(null);

		try {
			// Recarregar apenas ofertas, pois professores e disciplinas
			// já são carregados no useEffect inicial
			await fetchOfertas();

			const response = await axiosInstance.get("/horarios", {
				params: {
					ano: selectedAnoSemestre.ano,
					semestre: selectedAnoSemestre.semestre,
					id_curso: selectedCurso?.id || 1,
				},
			});

			const horariosFromDb = response.horarios || [];

			if (horariosFromDb.length === 0) {
				setEvents({});
				setOriginalHorarios([]);
				// Verificar se há anos/semestres anteriores disponíveis para importação
				const anosSemestresAnteriores = anosSemestres.filter(
					(as) =>
						as.ano < selectedAnoSemestre.ano ||
						(as.ano === selectedAnoSemestre.ano &&
							as.semestre < selectedAnoSemestre.semestre),
				);

				if (anosSemestresAnteriores.length > 0) {
					setShowImportModal(true);
				}
				return;
			}

			const eventsFormatted = {};
			const horariosOriginais = [];

			// Agrupar horários por disciplina, dia e horário para detectar múltiplos professores
			const groupedHorarios = {};

			horariosFromDb.forEach((horario, index) => {
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
					hora_inicio: horaInicio, // Usar hora normalizada
				});
			});

			// Processar grupos de horários
			Object.values(groupedHorarios).forEach((grupo, index) => {
				const baseHorario = grupo[0];

				// Validar apenas dados críticos
				if (!baseHorario.id_ccr) {
					return;
				}

				const event = dbToEventFormat(baseHorario, disciplinas);

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
					event.professorId = grupo[0].codigo_docente; // Compatibilidade
				} else {
					event.professoresIds = [baseHorario.codigo_docente];
					event.professorId = baseHorario.codigo_docente;
				}

				// Usar a fase do banco apenas para posicionamento inicial na tela
				const phase = getInitialPhaseFromDatabase(baseHorario);

				const slotKey = `${event.dayId}-${event.startTime}`;

				// Organizar eventos por fase (baseado no grid da tela)
				if (!eventsFormatted[phase]) eventsFormatted[phase] = {};

				// Atualizar a fase do evento para refletir onde está no grid
				event.fase = phase;

				// Verificar se já existe evento no slot
				if (eventsFormatted[phase][slotKey]) {
					// Se já existe, garantir que é um array e adicionar
					if (Array.isArray(eventsFormatted[phase][slotKey])) {
						eventsFormatted[phase][slotKey].push(event);
					} else {
						// Converter para array se não for
						eventsFormatted[phase][slotKey] = [
							eventsFormatted[phase][slotKey],
							event,
						];
					}
				} else {
					// CORREÇÃO: Se não existe, criar como objeto único (não array)
					eventsFormatted[phase][slotKey] = event;
				}

				// Adicionar aos horários originais (um para cada professor)
				grupo.forEach((horario) => {
					horariosOriginais.push(horario);
				});
			});

			// Aplicar correção de cores após carregamento
			const eventsWithFixedColors =
				fixEventColorsAfterLoading(eventsFormatted);

			setEvents(eventsWithFixedColors);
			setOriginalHorarios(horariosOriginais);
		} catch (error) {
			console.error("Erro ao recarregar dados:", error);

			if (error.response?.status === 404) {
				setLoadError("API não está disponível");
			} else if (error.message?.includes("ofertas")) {
				setLoadError(
					"Erro ao carregar ofertas. " +
						(error.response?.data?.message ||
							"Verifique a conexão."),
				);
			} else {
				setLoadError(
					error.response?.data?.message ||
						"Erro ao carregar dados do banco",
				);
			}
			setEvents({});
			setOriginalHorarios([]);
		} finally {
			setLoadingHorarios(false);
		}
	};

	// Função para contar horários válidos (com disciplina e professor)
	const getValidHorariosCount = () => {
		let count = 0;
		Object.keys(events).forEach((phaseNumber) => {
			const phaseEvents = events[phaseNumber];
			if (phaseEvents) {
				Object.values(phaseEvents).forEach((eventArray) => {
					const eventsInSlot = Array.isArray(eventArray)
						? eventArray
						: [eventArray];
					eventsInSlot.forEach((event) => {
						// Validar que tem disciplina e pelo menos um professor
						const hasProfessores =
							(event.professoresIds &&
								Array.isArray(event.professoresIds) &&
								event.professoresIds.length > 0) ||
							event.professorId;
						if (event.disciplinaId && hasProfessores) {
							// Se tem múltiplos professores, cada um será um registro separado no banco
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
	};

	// Função para contar mudanças desde a última sincronização
	const getChangesCount = () => {
		// Se ainda não carregou os dados originais (null/undefined), não calcular mudanças
		if (originalHorarios === null || originalHorarios === undefined) {
			return { added: 0, modified: 0, removed: 0, total: 0 };
		}

		// Se originalHorarios é array vazio [], significa que carregou mas não tinha horários
		// Neste caso, todos os eventos atuais são novos (added)

		// Converter eventos atuais para formato comparável
		const currentHorarios = [];
		Object.keys(events).forEach((phaseNumber) => {
			const phaseEvents = events[phaseNumber];
			if (phaseEvents) {
				Object.values(phaseEvents).forEach((eventArray) => {
					const eventsInSlot = Array.isArray(eventArray)
						? eventArray
						: [eventArray];
					eventsInSlot.forEach((event) => {
						// Só considerar horários válidos (com disciplina e professor)
						const hasProfessores =
							(event.professoresIds &&
								Array.isArray(event.professoresIds) &&
								event.professoresIds.length > 0) ||
							event.professorId;

						if (event.disciplinaId && hasProfessores) {
							// Se tem múltiplos professores, criar registro separado para cada um
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

										currentHorarios.push({
											id: uniqueId,
											id_ccr: event.disciplinaId,
											codigo_docente: professorId,
											dia_semana:
												dayToNumber[event.dayId],
											hora_inicio: normalizeTimeFromDB(
												event.startTime,
											),
											duracao: event.duration,
											fase: parseInt(phaseNumber),
											comentario: event.comentario || "",
										});
									},
								);
							} else if (event.professorId) {
								currentHorarios.push({
									id: event.id,
									id_ccr: event.disciplinaId,
									codigo_docente: event.professorId,
									dia_semana: dayToNumber[event.dayId],
									hora_inicio: normalizeTimeFromDB(
										event.startTime,
									),
									duracao: event.duration,
									fase: parseInt(phaseNumber),
									comentario: event.comentario || "",
								});
							}
						}
					});
				});
			}
		});

		let added = 0,
			modified = 0,
			removed = 0;

		// Contar adições e modificações
		currentHorarios.forEach((current) => {
			// Normalizar hora_inicio para comparação
			const currentHora = normalizeTimeFromDB(current.hora_inicio);

			const original = originalHorarios.find((orig) => {
				const originalHora = normalizeTimeFromDB(orig.hora_inicio);
				return (
					orig.id_ccr === current.id_ccr &&
					orig.codigo_docente === current.codigo_docente &&
					orig.dia_semana === current.dia_semana &&
					orig.fase === current.fase &&
					originalHora === currentHora
				);
			});

			if (!original) {
				added++; // Novo horário
			} else {
				// Verificar se foi modificado (duração, fase ou comentário)
				const isModified =
					original.duracao !== current.duracao ||
					original.fase !== current.fase ||
					(original.comentario || "") !== (current.comentario || "");

				if (isModified) {
					modified++;
				}
			}
		});

		// Contar remoções
		originalHorarios.forEach((original) => {
			const originalHora = normalizeTimeFromDB(original.hora_inicio);

			const current = currentHorarios.find((curr) => {
				const currentHora = normalizeTimeFromDB(curr.hora_inicio);
				return (
					curr.id_ccr === original.id_ccr &&
					curr.codigo_docente === original.codigo_docente &&
					curr.dia_semana === original.dia_semana &&
					curr.fase === original.fase &&
					currentHora === originalHora
				);
			});

			if (!current) {
				removed++; // Horário removido
			}
		});

		return { added, modified, removed, total: added + modified + removed };
	};

	// Função para verificar se há mudanças pendentes para sincronizar
	const hasPendingChanges = () => {
		const changes = getChangesCount();
		return changes.total > 0;
	};

	// Função para importar horários de ano/semestre anterior
	const importarHorarios = async () => {
		if (!selectedAnoSemestreOrigem || !selectedCurso) {
			setImportError("Selecione um ano/semestre de origem e um curso");
			return;
		}

		setImportLoading(true);
		setImportError(null);

		try {
			const response = await axiosInstance.post("/horarios/importar", {
				ano_origem: selectedAnoSemestreOrigem.ano,
				semestre_origem: selectedAnoSemestreOrigem.semestre,
				ano_destino: selectedAnoSemestre.ano,
				semestre_destino: selectedAnoSemestre.semestre,
				id_curso: selectedCurso.id,
				incluir_docentes: incluirDocentes,
				incluir_ofertas: incluirOfertas,
			});

			// Em nosso axios, a resposta pode já ser os dados.
			const data = response?.data ?? response;

			if (data) {
				const message = `Importação realizada com sucesso! ${
					data.horarios_importados || 0
				} horários e ${data.ofertas_importadas || 0} ofertas criados.`;
				setSnackbarMessage(message);
				setSnackbarOpen(true);
				setShowImportModal(false);

				// Recarregar os horários após importação
				await loadHorariosFromDatabase();
			} else {
				setImportError("Erro ao importar horários");
			}
		} catch (error) {
			console.error("Erro ao importar horários:", error);
			setImportError(
				error.response?.data?.message ||
					"Erro ao importar horários. Verifique a conexão.",
			);
		} finally {
			setImportLoading(false);
		}
	};

	// Função para fechar modal de importação
	const handleCloseImportModal = () => {
		setShowImportModal(false);
		setImportError(null);
		setIncluirDocentes(false);
		setIncluirOfertas(false);
		setSelectedAnoSemestreOrigem(null);
	};

	// Função para obter turno de uma fase específica baseado na oferta
	// Retorna todos os turnos disponíveis para uma fase
	const getTurnosOferta = (phaseNumber) => {
		if (!ofertas || ofertas.length === 0) {
			// Se não há ofertas carregadas, usar lógica padrão como fallback
			const isOddPhase = phaseNumber % 2 === 1;
			const defaultTurno =
				phaseNumber === 9
					? "noturno"
					: isEvenSemester
					? !isOddPhase
						? "vespertino"
						: "noturno"
					: isOddPhase
					? "vespertino"
					: "noturno";
			return [defaultTurno];
		}

		// Buscar todas as ofertas para a fase atual no ano/semestre selecionado
		const ofertasFase = ofertas.filter(
			(o) =>
				o.ano === selectedAnoSemestre.ano &&
				o.semestre === selectedAnoSemestre.semestre &&
				o.fase === phaseNumber &&
				o.id_curso === (selectedCurso?.id || 1),
		);

		if (ofertasFase.length === 0) {
			// Se não encontrou ofertas específicas, usar lógica padrão
			const isOddPhase = phaseNumber % 2 === 1;
			const defaultTurno =
				phaseNumber === 9
					? "noturno"
					: isEvenSemester
					? !isOddPhase
						? "vespertino"
						: "noturno"
					: isOddPhase
					? "vespertino"
					: "noturno";
			return [defaultTurno];
		}

		// Coletar todos os turnos das ofertas
		const turnos = ofertasFase
			.map((oferta) => {
				if (oferta && oferta.turno) {
					// Interpretar os valores de turno: M/m = matutino, V/v = vespertino, N/n = noturno
					const turnoValue = oferta.turno.toString().toLowerCase();
					if (turnoValue === "m" || turnoValue === "matutino") {
						return "matutino";
					} else if (
						turnoValue === "v" ||
						turnoValue === "vespertino"
					) {
						return "vespertino";
					} else if (turnoValue === "n" || turnoValue === "noturno") {
						return "noturno";
					} else {
						return turnoValue;
					}
				}
				return null;
			})
			.filter(Boolean); // Remover valores null/undefined

		// Remover duplicatas e retornar array com todos os turnos únicos
		return [...new Set(turnos)];
	};

	// Função para obter o turno principal de uma fase (para compatibilidade)
	const getTurnoOferta = (phaseNumber) => {
		const turnos = getTurnosOferta(phaseNumber);
		return turnos[0] || "vespertino"; // Retorna o primeiro turno ou vespertino como fallback
	};

	// Verifica se uma fase tem múltiplos turnos
	const hasMultiplosTurnos = (phaseNumber) => {
		const turnos = getTurnosOferta(phaseNumber);
		return turnos.length > 1;
	};

	// Verifica se uma fase tem turno específico
	const hasTurnoEspecifico = (phaseNumber, turno) => {
		const turnos = getTurnosOferta(phaseNumber);
		return turnos.includes(turno);
	};

	// Função para verificar se uma fase é vespertino baseado na oferta
	const isPhaseVespertino = (phaseNumber) => {
		// Se tem múltiplos turnos, considerar como não vespertino
		// para permitir renderização completa
		if (hasMultiplosTurnos(phaseNumber)) {
			return false; // Será tratado pelo componente de forma especial
		}
		const turno = getTurnoOferta(phaseNumber);
		return turno === "vespertino";
	};

	// Função para verificar se uma fase é matutino baseado na oferta
	const isPhaseMatutino = (phaseNumber) => {
		// Se tem múltiplos turnos, considerar como não matutino
		// para permitir renderização completa
		if (hasMultiplosTurnos(phaseNumber)) {
			return false; // Será tratado pelo componente de forma especial
		}
		const turno = getTurnoOferta(phaseNumber);
		return turno === "matutino";
	};

	// Função para obter fases disponíveis baseado nas ofertas
	const getFasesDisponiveis = () => {
		if (!ofertas || ofertas.length === 0) {
			// Se ainda está carregando ofertas ou houve erro, retornar array vazio
			return [];
		}

		// Filtrar ofertas para o ano/semestre/curso atual
		const ofertasAtuais = ofertas.filter(
			(o) =>
				o.ano === selectedAnoSemestre.ano &&
				o.semestre === selectedAnoSemestre.semestre &&
				o.id_curso === (selectedCurso?.id || 1),
		);

		if (ofertasAtuais.length === 0) {
			// Se não há ofertas para o período atual, retornar array vazio (sem grids)
			return [];
		}

		// Extrair e ordenar as fases das ofertas
		const fases = ofertasAtuais.map((o) => o.fase).sort((a, b) => a - b);

		// Remover duplicatas e retornar
		return [...new Set(fases)];
	};

	// Buscar dados iniciais quando o componente for montado
	useEffect(() => {
		fetchCursos();
		fetchProfessores();
		fetchDisciplinas();
		fetchAnosSemestres();
	}, []);

	// Carregar horários quando disciplinas estiverem carregadas, curso selecionado e ano/semestre mudar
	useEffect(() => {
		if (
			disciplinas.length > 0 &&
			selectedCurso &&
			selectedAnoSemestre.ano &&
			selectedAnoSemestre.semestre
		) {
			// Limpar eventos atuais antes de carregar novos
			setEvents({});
			setOriginalHorarios([]);
			loadHorariosFromDatabase();
		}
	}, [disciplinas, selectedCurso, selectedAnoSemestre]);

	// Recarregar ofertas quando ano/semestre ou curso mudar
	useEffect(() => {
		if (
			selectedCurso &&
			selectedAnoSemestre.ano &&
			selectedAnoSemestre.semestre
		) {
			fetchOfertas();
		}
	}, [selectedCurso, selectedAnoSemestre]);

	// Limpar erro de carregamento quando trocar ano/semestre
	useEffect(() => {
		setLoadError(null);
	}, [selectedAnoSemestre]);

	// Detectar conflitos quando eventos ou dados mudarem
	useEffect(() => {
		const detectConflicts = async () => {
			if (
				professores.length > 0 &&
				disciplinas.length > 0 &&
				anosSemestres.length > 0
			) {
				// Log removido
				await detectarConflitosHorarios();
			}
		};

		detectConflicts();
	}, [events, professores, disciplinas, anosSemestres]);

	// Debug: Monitora mudanças no estado de conflitos
	useEffect(() => {
		// Log removido
		if (conflitosHorarios.length > 0) {
			// Log removido
		}
	}, [conflitosHorarios]);

	// Função para buscar cor de disciplina no primeiro período cronológico (prioridade: matutino primeiro, depois vespertino primeiro, depois noturno primeiro)
	// NOVA FUNÇÃO: Buscar cor apenas entre eventos noturnos
	const getDisciplinaColorFromNoturnoOnly = (
		disciplinaId,
		phaseNumber,
		events,
	) => {
		if (!disciplinaId || !events[phaseNumber]) return null;

		const dayOrder = [
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday",
		];

		// PRIORIDADE 1: Buscar nos primeiros períodos noturnos
		for (const dayId of dayOrder) {
			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				for (const event of eventsInSlot) {
					if (
						event.disciplinaId === disciplinaId &&
						event.dayId === dayId &&
						firstNoturnoSlots.includes(event.startTime)
					) {
						return getColorByDay(dayId);
					}
				}
			}
		}

		// PRIORIDADE 2: Buscar nos segundos períodos noturnos
		for (const dayId of dayOrder) {
			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				for (const event of eventsInSlot) {
					if (
						event.disciplinaId === disciplinaId &&
						event.dayId === dayId &&
						secondNoturnoSlots.includes(event.startTime)
					) {
						return getColorByDay(dayId);
					}
				}
			}
		}

		// PRIORIDADE 3: Qualquer evento noturno da disciplina
		for (const [, eventArray] of Object.entries(events[phaseNumber])) {
			const eventsInSlot = Array.isArray(eventArray)
				? eventArray
				: [eventArray];
			for (const event of eventsInSlot) {
				if (
					event.disciplinaId === disciplinaId &&
					allNoturnoSlots.includes(event.startTime) &&
					event.color
				) {
					return event.color;
				}
			}
		}

		return null;
	};

	// NOVA FUNÇÃO: Buscar cor apenas entre eventos matutinos/vespertinos
	const getDisciplinaColorFromMatutinoVespertinoOnly = (
		disciplinaId,
		phaseNumber,
		events,
	) => {
		if (!disciplinaId || !events[phaseNumber]) return null;

		const dayOrder = [
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday",
		];
		const allFirstMatutinoVespertinoSlots = [
			...firstMatutinoSlots,
			...firstVespertinoSlots,
		];

		// PRIORIDADE 1: Buscar nos primeiros períodos matutinos/vespertinos
		for (const dayId of dayOrder) {
			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				for (const event of eventsInSlot) {
					if (
						event.disciplinaId === disciplinaId &&
						event.dayId === dayId &&
						allFirstMatutinoVespertinoSlots.includes(
							event.startTime,
						)
					) {
						return getColorByDay(dayId);
					}
				}
			}
		}

		// PRIORIDADE 2: Buscar nos segundos períodos matutinos/vespertinos
		const allSecondMatutinoVespertinoSlots = [
			...secondMatutinoSlots,
			...secondVespertinoSlots,
		];
		for (const dayId of dayOrder) {
			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				for (const event of eventsInSlot) {
					if (
						event.disciplinaId === disciplinaId &&
						event.dayId === dayId &&
						allSecondMatutinoVespertinoSlots.includes(
							event.startTime,
						)
					) {
						return getColorByDay(dayId);
					}
				}
			}
		}

		// PRIORIDADE 3: Qualquer evento matutino/vespertino da disciplina
		for (const [, eventArray] of Object.entries(events[phaseNumber])) {
			const eventsInSlot = Array.isArray(eventArray)
				? eventArray
				: [eventArray];
			for (const event of eventsInSlot) {
				if (
					event.disciplinaId === disciplinaId &&
					allMatutinoVespertinoSlots.includes(event.startTime) &&
					event.color
				) {
					return event.color;
				}
			}
		}

		return null;
	};

	const getDisciplinaColorFromFirstPeriod = (
		disciplinaId,
		phaseNumber,
		events,
		currentEventStartTime = null, // NOVO: horário do evento atual para determinar contexto
	) => {
		if (!disciplinaId || !events[phaseNumber]) return null;

		// NOVA LÓGICA: Verificar se há terceiro evento noturno separado
		const hasThirdNoturnoSeparado = hasThirdEventNoturnoSeparado(
			disciplinaId,
			phaseNumber,
			events,
		);

		// Se há terceiro evento noturno separado, tratar eventos noturnos de forma independente
		if (hasThirdNoturnoSeparado && currentEventStartTime) {
			if (isHorarioNoturno(currentEventStartTime)) {
				// Para eventos noturnos, buscar cor apenas entre eventos noturnos
				return getDisciplinaColorFromNoturnoOnly(
					disciplinaId,
					phaseNumber,
					events,
				);
			} else {
				// Para eventos matutinos/vespertinos, buscar cor apenas entre matutinos/vespertinos
				return getDisciplinaColorFromMatutinoVespertinoOnly(
					disciplinaId,
					phaseNumber,
					events,
				);
			}
		}

		// LÓGICA ORIGINAL: Buscar a cor do primeiro período desta disciplina em QUALQUER dia da semana
		// Isso garante que eventos no segundo período mantenham a cor consistente

		const dayOrder = [
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday",
		];
		const allFirstSlots = [
			...firstMatutinoSlots,
			...firstVespertinoSlots,
			...firstNoturnoSlots,
		];

		// PRIORIDADE 1: Buscar nos primeiros períodos ordenados por dia da semana
		// (segunda tem prioridade sobre terça, etc.)
		for (const dayId of dayOrder) {
			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				for (const event of eventsInSlot) {
					if (
						event.disciplinaId === disciplinaId &&
						event.dayId === dayId &&
						allFirstSlots.includes(event.startTime)
					) {
						// Retornar cor baseada no dia da semana do primeiro evento encontrado
						return getColorByDay(dayId);
					}
				}
			}
		}

		// PRIORIDADE 2: Se não encontrou nos primeiros períodos, buscar nos segundos períodos
		// ordenados por dia da semana (segunda tem prioridade sobre terça, etc.)
		const allSecondSlots = [
			...secondMatutinoSlots,
			...secondVespertinoSlots,
			...secondNoturnoSlots,
		];

		for (const dayId of dayOrder) {
			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				for (const event of eventsInSlot) {
					if (
						event.disciplinaId === disciplinaId &&
						event.dayId === dayId &&
						allSecondSlots.includes(event.startTime)
					) {
						// Retornar cor baseada no dia da semana do primeiro evento encontrado
						return getColorByDay(dayId);
					}
				}
			}
		}

		// PRIORIDADE 3: Se não encontrou nem nos primeiros nem nos segundos períodos,
		// buscar qualquer evento existente da mesma disciplina para manter consistência
		for (const [, eventArray] of Object.entries(events[phaseNumber])) {
			const eventsInSlot = Array.isArray(eventArray)
				? eventArray
				: [eventArray];
			for (const event of eventsInSlot) {
				if (event.disciplinaId === disciplinaId && event.color) {
					return event.color;
				}
			}
		}

		return null;
	};

	// Função para corrigir cores após carregamento dos dados
	const fixEventColorsAfterLoading = (eventsFormatted) => {
		// Para cada fase
		Object.keys(eventsFormatted).forEach((phase) => {
			const phaseEvents = eventsFormatted[phase];

			// Para cada slot de eventos
			Object.keys(phaseEvents).forEach((slotKey) => {
				const eventsInSlot = Array.isArray(phaseEvents[slotKey])
					? phaseEvents[slotKey]
					: [phaseEvents[slotKey]];

				// Para cada evento no slot
				eventsInSlot.forEach((event) => {
					// NOVA LÓGICA: Buscar cor considerando terceiro evento noturno separado
					const firstPeriodColor = getDisciplinaColorFromFirstPeriod(
						event.disciplinaId,
						phase,
						eventsFormatted,
						event.startTime, // NOVO: passar o horário atual para contexto
					);

					// Aplicar lógica de cores dos turnos

					const allFirstSlots = [
						...firstMatutinoSlots,
						...firstVespertinoSlots,
						...firstNoturnoSlots,
					];
					const allSecondSlots = [
						...secondMatutinoSlots,
						...secondVespertinoSlots,
						...secondNoturnoSlots,
					];

					if (
						event.startTime &&
						allFirstSlots.includes(event.startTime)
					) {
						// Primeiro período - usar cor do primeiro dia da semana onde a disciplina aparece
						if (firstPeriodColor) {
							event.color = firstPeriodColor;
						} else {
							event.color = getColorByDay(event.dayId);
						}
					} else if (
						event.startTime &&
						allSecondSlots.includes(event.startTime)
					) {
						// Segundo período - seguir cor do primeiro período, ou se não há first slots, usar cor do primeiro dia em second slots
						if (firstPeriodColor) {
							event.color = firstPeriodColor;
						} else {
							event.color = getColorByDay(event.dayId);
						}
					} else {
						// Outros horários - usar cor do dia
						event.color = getColorByDay(event.dayId);
					}
				});
			});
		});

		return eventsFormatted;
	};

	// Função modificada para obter cor baseada no dia e contexto
	const getEventColor = useCallback(
		(dayId, time, disciplinaId, phaseNumber, events) => {
			// NOVA LÓGICA: Aplicar regras especiais para terceiro evento noturno

			// Buscar cor do primeiro período cronológico para esta disciplina (passando o horário atual)
			const firstPeriodColor = getDisciplinaColorFromFirstPeriod(
				disciplinaId,
				phaseNumber,
				events,
				time, // NOVO: passar o horário atual para contexto
			);

			const allFirstSlots = [
				...firstMatutinoSlots,
				...firstVespertinoSlots,
				...firstNoturnoSlots,
			];
			const allSecondSlots = [
				...secondMatutinoSlots,
				...secondVespertinoSlots,
				...secondNoturnoSlots,
			];

			if (allFirstSlots.includes(time)) {
				// Primeiro período - usar cor do primeiro dia da semana onde a disciplina aparece
				if (firstPeriodColor) {
					return firstPeriodColor;
				}
				return getColorByDay(dayId);
			} else if (allSecondSlots.includes(time)) {
				// Segundo período - seguir cor do primeiro período
				if (firstPeriodColor) {
					return firstPeriodColor;
				}
				return getColorByDay(dayId);
			}

			// Para todos os outros casos, usar cor padrão do dia
			return getColorByDay(dayId);
		},
		[],
	);

	const handleDropEvent = useCallback(
		(eventData, dayId, time, phaseNumber) => {
			// Validação: não permitir mover eventos sem disciplina
			if (!eventData.disciplinaId) {
				setSnackbarMessage(
					"Não é possível mover um horário sem disciplina definida. Complete as informações primeiro.",
				);
				setSnackbarOpen(true);
				return;
			}

			setEvents((prev) => {
				const newEvents = { ...prev };

				// Remove event from old position
				Object.keys(newEvents).forEach((phase) => {
					if (newEvents[phase]) {
						Object.keys(newEvents[phase]).forEach((key) => {
							const eventArray = Array.isArray(
								newEvents[phase][key],
							)
								? newEvents[phase][key]
								: [newEvents[phase][key]];
							const filteredEvents = eventArray.filter(
								(event) => event.id !== eventData.id,
							);

							if (filteredEvents.length === 0) {
								delete newEvents[phase][key];
							} else {
								newEvents[phase][key] = filteredEvents;
							}
						});
					}
				});

				// Add event to new position
				if (!newEvents[phaseNumber]) {
					newEvents[phaseNumber] = {};
				}

				const newKey = `${dayId}-${time}`;

				// Determinar cor baseada no contexto do novo local
				const newColor = getEventColor(
					dayId,
					time,
					eventData.disciplinaId,
					phaseNumber,
					newEvents,
				);

				const updatedEvent = {
					...eventData,
					startTime: time,
					color: newColor,
					dayId: dayId,

					// Sincronizar campos do banco
					dia_semana: dayToNumber[dayId],
					fase: phaseNumber, // Manter a fase atualizada
					hora_inicio: time,
				};

				// Se já existe evento no slot, adicionar ao array; senão, criar novo array
				if (newEvents[phaseNumber][newKey]) {
					const existingEvents = Array.isArray(
						newEvents[phaseNumber][newKey],
					)
						? newEvents[phaseNumber][newKey]
						: [newEvents[phaseNumber][newKey]];
					newEvents[phaseNumber][newKey] = [
						...existingEvents,
						updatedEvent,
					];
				} else {
					// CORREÇÃO: Criar como objeto único, não array de um elemento
					newEvents[phaseNumber][newKey] = updatedEvent;
				}

				// Atualizar cores relacionadas se necessário
				if (eventData.disciplinaId) {
					updateRelatedDisciplinaColors(
						newEvents,
						phaseNumber,
						eventData.disciplinaId,
						// Não proteger o evento para permitir recálculo completo das cores
					);
				}

				return newEvents;
			});
		},
		[getEventColor],
	);

	const handleResizeEvent = useCallback(
		(eventId, newDuration, phaseNumber) => {
			setEvents((prev) => {
				const newEvents = { ...prev };

				if (newEvents[phaseNumber]) {
					Object.keys(newEvents[phaseNumber]).forEach((key) => {
						const eventArray = Array.isArray(
							newEvents[phaseNumber][key],
						)
							? newEvents[phaseNumber][key]
							: [newEvents[phaseNumber][key]];
						const updatedEvents = eventArray.map((event) => {
							if (event.id === eventId) {
								// Verificar se a fase tem múltiplos turnos
								const temMultiplosTurnos =
									hasMultiplosTurnos(phaseNumber);

								// Determinar os slots de tempo disponíveis
								let timeSlots;
								if (temMultiplosTurnos) {
									// Usar todos os slots combinados conforme ofertas
									const turnos = getTurnosOferta(phaseNumber);
									timeSlots = [];

									if (turnos.includes("matutino")) {
										timeSlots = [
											...timeSlots,
											...timeSlotsMatutino,
										];
									}
									if (turnos.includes("vespertino")) {
										timeSlots = [
											...timeSlots,
											...timeSlotsVespertino,
										];
									}
									if (turnos.includes("noturno")) {
										timeSlots = [
											...timeSlots,
											...timeSlotsNoturno,
										];
									}
								} else {
									// Usar a função para determinar o turno baseado na oferta
									const isMatutino =
										isPhaseMatutino(phaseNumber);
									const isVespertino =
										isPhaseVespertino(phaseNumber);

									if (isMatutino) {
										timeSlots = timeSlotsMatutino;
									} else if (isVespertino) {
										timeSlots = timeSlotsVespertino;
									} else {
										timeSlots = timeSlotsNoturno;
									}
								}

								// Calcular a duração máxima com base no slot inicial
								const startIndex = timeSlots.indexOf(
									event.startTime,
								);
								let maxDuration = 0;

								if (startIndex >= 0) {
									maxDuration = timeSlots.length - startIndex;
								} else {
									maxDuration = timeSlots.length;
								}

								return {
									...event,
									duration: Math.max(
										1,
										Math.min(newDuration, maxDuration),
									),
								};
							}
							return event;
						});

						// Preservar estrutura: single event ou array
						if (updatedEvents.length === 1) {
							newEvents[phaseNumber][key] = updatedEvents[0];
						} else {
							newEvents[phaseNumber][key] = updatedEvents;
						}
					});
				}

				return newEvents;
			});
		},
		[selectedAnoSemestre, isPhaseVespertino, hasMultiplosTurnos],
	);

	const handleAddEvent = useCallback(
		(dayId, time, phaseNumber) => {
			// Verificar se a fase tem múltiplos turnos
			const temMultiplosTurnos = hasMultiplosTurnos(phaseNumber);

			// Determinar se é horário matutino, vespertino ou noturno baseado na hora clicada
			const isHorarioMatutino = timeSlotsMatutino.includes(time);
			const isHorarioVespertino = timeSlotsVespertino.includes(time);
			const isHorarioNoturno = timeSlotsNoturno.includes(time);

			// Verificar se a fase é matutino ou vespertino (quando não tem múltiplos turnos)
			const isMatutino = isPhaseMatutino(phaseNumber);
			const isVespertino = isPhaseVespertino(phaseNumber);

			let defaultDuration = 2;

			// Lógica para definir duração padrão
			if (isHorarioMatutino) {
				// Matutino: 07:30 - 12:00
				const timeIndex = timeSlotsMatutino.indexOf(time);

				if (timeIndex >= 0 && timeIndex < 5) {
					// Clique entre 07:30 e 09:30 -> cobre até 10:00 (5 slots)
					defaultDuration = 5;
				} else if (timeIndex >= 5) {
					// Clique entre 10:00 e 12:00 -> criar evento das 10:00 às 12:00
					time = "10:00:00"; // Sempre começa em 10:00:00
					defaultDuration = 4; // 10:00:00, 10:30:00, 11:00:00, 11:30:00 = 4 slots até 12:00:00
				}
			} else if (isHorarioVespertino) {
				// Vespertino: 13:30 - 18:00
				const timeIndex = timeSlotsVespertino.indexOf(time);

				if (timeIndex >= 0 && timeIndex < 5) {
					// Clique entre 13:30 e 15:30 -> cobre até 16:00 (5 slots)
					defaultDuration = 5;
				} else if (timeIndex >= 5) {
					// Clique entre 16:00:00 e 18:00:00 -> sempre cria horário das 16:00:00 às 18:00:00
					time = "16:00:00"; // Sempre começa em 16:00:00
					defaultDuration = 4; // 16:00:00, 16:30:00, 17:00:00, 17:30:00 = 4 slots até 18:00:00
				}
			} else if (isHorarioNoturno) {
				// Verificar se está no início do período noturno
				const timeIndex = timeSlotsNoturno.indexOf(time);

				if (timeIndex === 0) {
					// Se clicou em 19:00:00, criar evento para todo o período noturno
					defaultDuration = 7; // 19:00:00 até 22:00:00 (7 slots, máximo para início de aula)
				} else {
					// Caso contrário, criar evento com duração apropriada até o final
					// Mas limitando para que nenhuma aula comece após 22:00:00
					const maxDurationToLimit = Math.min(
						timeSlotsNoturno.length - timeIndex,
						7 - timeIndex,
					);
					defaultDuration = maxDurationToLimit;
				}
			}

			// Cor padrão inicial baseada no dia
			const defaultColor = getColorByDay(dayId);
			const ano = selectedAnoSemestre.ano;
			const semestre = selectedAnoSemestre.semestre;

			const newEventId = `horario-${phaseNumber}-${Date.now()}`;
			const newEvent = {
				// Campos da UI (mantidos para compatibilidade)
				id: newEventId,
				title: "",
				startTime: time,
				duration: defaultDuration,
				color: defaultColor,
				professorId: "",
				disciplinaId: null,
				dayId: dayId,

				// Campos do banco de dados
				id_curso: selectedCurso?.id || 1, // Usar curso selecionado
				id_ccr: null,
				codigo_docente: "",
				dia_semana: dayToNumber[dayId],
				ano: ano,
				semestre: semestre,
				fase: phaseNumber, // Incluir a fase
				hora_inicio: time,
				duracao: defaultDuration,
				comentario: "",
			};

			setSelectedEvent(newEvent);
			setSelectedPhase(phaseNumber);
			setModalOpen(true);
		},
		[selectedAnoSemestre, isPhaseVespertino, hasMultiplosTurnos],
	);

	const handleEditEvent = useCallback((event, phaseNumber) => {
		// Fazer backup completo do evento original
		setOriginalEventBackup(JSON.parse(JSON.stringify(event)));
		setSelectedEvent(event);
		setSelectedPhase(phaseNumber);
		setModalOpen(true);
	}, []);

	const handleDeleteEvent = useCallback(
		(eventId, phaseNumber) => {
			setEvents((prev) => {
				const newEvents = { ...prev };

				if (!newEvents[phaseNumber]) {
					return newEvents;
				}

				// Criar nova referência da fase
				newEvents[phaseNumber] = { ...newEvents[phaseNumber] };

				// Procurar e remover o evento em todos os slots da fase
				Object.keys(newEvents[phaseNumber]).forEach((key) => {
					const eventArray = Array.isArray(
						newEvents[phaseNumber][key],
					)
						? newEvents[phaseNumber][key]
						: [newEvents[phaseNumber][key]];

					const filteredEvents = eventArray.filter(
						(event) => event.id !== eventId,
					);

					if (filteredEvents.length === 0) {
						// Se não há mais eventos no slot, remover a chave
						delete newEvents[phaseNumber][key];
					} else if (filteredEvents.length === 1) {
						// Se resta apenas um evento, converter de array para objeto único
						newEvents[phaseNumber][key] = filteredEvents[0];
					} else {
						// Se restam múltiplos eventos, manter como array
						newEvents[phaseNumber][key] = filteredEvents;
					}
				});

				return newEvents;
			});
		},
		[professores, disciplinas, anosSemestres],
	);

	const handleSaveEvent = useCallback(
		(eventData) => {
			// Validação obrigatória: disciplina deve estar definida
			if (!eventData.disciplinaId) {
				console.error(
					"Tentativa de salvar evento sem disciplina:",
					eventData,
				);
				setSnackbarMessage(
					"Erro: Não é possível salvar um horário sem disciplina definida.",
				);
				setSnackbarOpen(true);
				return;
			}

			// Validação obrigatória: pelo menos um professor deve estar definido
			const hasProfessores =
				(eventData.professoresIds &&
					Array.isArray(eventData.professoresIds) &&
					eventData.professoresIds.length > 0) ||
				eventData.professorId;
			if (!hasProfessores) {
				console.error(
					"Tentativa de salvar evento sem professor:",
					eventData,
				);
				setSnackbarMessage(
					"Erro: Não é possível salvar um horário sem professor definido.",
				);
				setSnackbarOpen(true);
				return;
			}

			setEvents((prev) => {
				const newEvents = { ...prev };

				if (!newEvents[selectedPhase]) {
					newEvents[selectedPhase] = {};
				}

				// A cor será determinada depois que o evento for adicionado à estrutura

				// Verificar se o evento já existe na estrutura atual
				let eventExists = false;
				let existingEventKey = null;
				let originalDisciplinaId = null; // Declarar no escopo mais amplo

				Object.keys(newEvents[selectedPhase]).forEach((key) => {
					const eventArray = Array.isArray(
						newEvents[selectedPhase][key],
					)
						? newEvents[selectedPhase][key]
						: [newEvents[selectedPhase][key]];
					if (eventArray.some((event) => event.id === eventData.id)) {
						eventExists = true;
						existingEventKey = key;
						// Capturar disciplina original
						const originalEvent = eventArray.find(
							(event) => event.id === eventData.id,
						);
						if (originalEvent) {
							originalDisciplinaId = originalEvent.disciplinaId;
						}
					}
				});

				if (eventExists) {
					// Para edição de eventos existentes
					const eventArray = Array.isArray(
						newEvents[selectedPhase][existingEventKey],
					)
						? newEvents[selectedPhase][existingEventKey]
						: [newEvents[selectedPhase][existingEventKey]];

					const updatedEvents = eventArray.map((event) => {
						if (event.id === eventData.id) {
							const ano = selectedAnoSemestre.ano;
							const semestre = selectedAnoSemestre.semestre;

							const updatedEvent = {
								...event,
								// Atualizar todos os campos principais da UI
								title: eventData.title || "",
								disciplinaId: eventData.disciplinaId,
								professoresIds:
									eventData.professoresIds ||
									[eventData.professorId].filter(Boolean),
								professorId:
									eventData.professorId ||
									(eventData.professoresIds &&
										eventData.professoresIds[0]) ||
									"",
								comentario: eventData.comentario || "",
								permitirConflito:
									eventData.permitirConflito || false,
								startTime:
									eventData.startTime || event.startTime,
								duration: eventData.duration || event.duration,
								dayId: eventData.dayId || event.dayId,

								// A cor será atualizada posteriormente pela função updateRelatedDisciplinaColors
								color: event.color,

								// Sincronizar campos do banco
								id_ccr:
									eventData.disciplinaId || eventData.id_ccr,
								codigo_docente:
									(eventData.professoresIds &&
										eventData.professoresIds[0]) ||
									eventData.professorId ||
									eventData.codigo_docente,
								dia_semana:
									dayToNumber[eventData.dayId] ||
									eventData.dia_semana,
								ano: ano,
								semestre: semestre,
								fase: selectedPhase,
								hora_inicio:
									eventData.startTime ||
									eventData.hora_inicio,
								duracao:
									eventData.duration || eventData.duracao,
								permitirConflito:
									eventData.permitirConflito || false,
							};

							return updatedEvent;
						}
						return event;
					});
					// Preservar estrutura: single event ou array
					// CORREÇÃO: Forçar criação de nova referência para o React detectar mudanças
					// Criar nova referência da fase também
					newEvents[selectedPhase] = { ...newEvents[selectedPhase] };

					if (updatedEvents.length === 1) {
						// Criar nova referência do objeto para forçar re-render
						newEvents[selectedPhase][existingEventKey] = {
							...updatedEvents[0],
						};
					} else {
						// Criar novo array com novas referências dos objetos
						newEvents[selectedPhase][existingEventKey] =
							updatedEvents.map((event) => ({ ...event }));
					}
				} else {
					// Para eventos novos
					const newKey = `${eventData.dayId}-${eventData.startTime}`;
					const ano = selectedAnoSemestre.ano;
					const semestre = selectedAnoSemestre.semestre;

					const newEvent = {
						...eventData,
						color: getColorByDay(eventData.dayId), // Cor temporária, será atualizada posteriormente
						duration: eventData.duration || 2,

						// Sincronizar campos do banco
						id_curso: selectedCurso?.id || 1,
						id_ccr: eventData.disciplinaId || eventData.id_ccr,
						codigo_docente:
							eventData.professoresIds?.[0] ||
							eventData.professorId ||
							eventData.codigo_docente, // Manter compatibilidade
						dia_semana:
							dayToNumber[eventData.dayId] ||
							eventData.dia_semana,
						ano: ano,
						semestre: semestre,
						fase: selectedPhase, // Incluir a fase
						hora_inicio:
							eventData.startTime || eventData.hora_inicio,
						duracao: eventData.duration || eventData.duracao,
						comentario: eventData.comentario || "",
						permitirConflito: eventData.permitirConflito || false,
					};

					// Se já existe evento no slot, adicionar ao array; senão, criar objeto único
					// Criar nova referência da fase também para novos eventos
					newEvents[selectedPhase] = { ...newEvents[selectedPhase] };

					if (newEvents[selectedPhase][newKey]) {
						const existingEvents = Array.isArray(
							newEvents[selectedPhase][newKey],
						)
							? newEvents[selectedPhase][newKey]
							: [newEvents[selectedPhase][newKey]];
						newEvents[selectedPhase][newKey] = [
							...existingEvents,
							newEvent,
						];
					} else {
						// CORREÇÃO: Criar como objeto único, não array de um elemento
						newEvents[selectedPhase][newKey] = newEvent;
					}
				}

				// Após salvar, verificar se há outras partes da mesma disciplina para atualizar cores e sincronizar dados

				if (eventData.disciplinaId) {
					updateRelatedDisciplinaColors(
						newEvents,
						selectedPhase,
						eventData.disciplinaId,
						// Não proteger o evento para permitir recálculo completo das cores
					);

					// Sincronizar disciplina, professores e comentários em eventos relacionados da mesma oferta
					// Usar disciplina original se evento existia (para sincronização), senão usar a atual
					const disciplinaParaSincronizar =
						eventExists && originalDisciplinaId
							? originalDisciplinaId
							: eventData.disciplinaId;
					updateRelatedEvents(
						newEvents,
						selectedPhase,
						disciplinaParaSincronizar,
						eventData,
						eventData.id, // ID do evento atual para proteção
					);
				}

				return newEvents;
			});

			// Limpar backup após salvar com sucesso
			setOriginalEventBackup(null);
		},
		[
			selectedPhase,
			getEventColor,
			selectedAnoSemestre,
			professores,
			disciplinas,
			anosSemestres,
		],
	);

	// Função para sincronizar disciplina, professores e comentários em eventos relacionados da mesma oferta
	const updateRelatedEvents = (
		events,
		phaseNumber,
		originalDisciplinaId,
		updatedEventData,
		protectedEventId = null,
	) => {
		if (!events[phaseNumber] || !originalDisciplinaId || !updatedEventData)
			return;

		// NOVA LÓGICA: Verificar se há terceiro evento noturno separado
		const hasThirdNoturnoSeparado = hasThirdEventNoturnoSeparado(
			originalDisciplinaId,
			phaseNumber,
			events,
		);

		// Obter o horário do evento que está sendo atualizado para determinar contexto
		const currentEventStartTime = updatedEventData.startTime;

		// Encontrar todos os eventos da disciplina original na mesma fase
		for (const [eventKey, eventArray] of Object.entries(
			events[phaseNumber],
		)) {
			const eventsInSlot = Array.isArray(eventArray)
				? eventArray
				: [eventArray];

			const updatedEvents = eventsInSlot.map((event) => {
				// Proteger o evento que acabou de ser atualizado
				if (protectedEventId && event.id === protectedEventId) {
					return event;
				}

				// Sincronizar apenas eventos da mesma disciplina original
				if (event.disciplinaId === originalDisciplinaId) {
					// NOVA REGRA: Se há terceiro evento noturno separado, só sincronizar dentro do mesmo contexto
					if (hasThirdNoturnoSeparado && currentEventStartTime) {
						const isCurrentNoturno = isHorarioNoturno(
							currentEventStartTime,
						);
						const isEventNoturno = isHorarioNoturno(
							event.startTime,
						);

						// Só sincronizar se ambos são do mesmo contexto (ambos noturnos ou ambos matutino/vespertino)
						if (isCurrentNoturno !== isEventNoturno) {
							return event; // Não sincronizar eventos de contextos diferentes
						}
					}

					return {
						...event,
						// Sincronizar disciplina
						disciplinaId: updatedEventData.disciplinaId,
						title: updatedEventData.title,
						id_ccr: updatedEventData.disciplinaId,

						// Sincronizar professores
						professoresIds:
							updatedEventData.professoresIds ||
							[updatedEventData.professorId].filter(Boolean),
						professorId:
							updatedEventData.professorId ||
							(updatedEventData.professoresIds &&
								updatedEventData.professoresIds[0]) ||
							"",
						codigo_docente:
							(updatedEventData.professoresIds &&
								updatedEventData.professoresIds[0]) ||
							updatedEventData.professorId ||
							event.codigo_docente,

						// Sincronizar comentários
						comentario: updatedEventData.comentario || "",
					};
				}
				return event;
			});

			// Atualizar a estrutura preservando formato original
			if (updatedEvents.length === 1) {
				events[phaseNumber][eventKey] = updatedEvents[0];
			} else {
				events[phaseNumber][eventKey] = updatedEvents;
			}
		}
	};

	// NOVA FUNÇÃO: Atualizar cores para disciplinas com terceiro evento noturno separado
	const updateColorsForSeparatedNoturno = (
		events,
		phaseNumber,
		disciplinaId,
		protectedEventId,
	) => {
		// Obter cores separadas para eventos noturnos e matutinos/vespertinos
		const noturnoColor = getDisciplinaColorFromNoturnoOnly(
			disciplinaId,
			phaseNumber,
			events,
		);
		const matutinoVespertinoColor =
			getDisciplinaColorFromMatutinoVespertinoOnly(
				disciplinaId,
				phaseNumber,
				events,
			);

		for (const [eventKey, eventArray] of Object.entries(
			events[phaseNumber],
		)) {
			const eventsInSlot = Array.isArray(eventArray)
				? eventArray
				: [eventArray];
			const updatedEvents = eventsInSlot.map((event) => {
				// 🛡️ PROTEÇÃO: Proteger evento sendo editado
				if (protectedEventId && event.id === protectedEventId) {
					return event;
				}

				if (event.disciplinaId === disciplinaId) {
					if (isHorarioNoturno(event.startTime)) {
						// Eventos noturnos usam cor dos eventos noturnos
						return {
							...event,
							color: noturnoColor || getColorByDay(event.dayId),
						};
					} else if (isHorarioMatutinoOuVespertino(event.startTime)) {
						// Eventos matutinos/vespertinos usam cor dos eventos matutinos/vespertinos
						return {
							...event,
							color:
								matutinoVespertinoColor ||
								getColorByDay(event.dayId),
						};
					}
				}

				return event;
			});

			// Preservar estrutura
			if (updatedEvents.length === 1) {
				events[phaseNumber][eventKey] = updatedEvents[0];
			} else {
				events[phaseNumber][eventKey] = updatedEvents;
			}
		}
	};

	// Função para atualizar cores de disciplinas relacionadas
	const updateRelatedDisciplinaColors = (
		events,
		phaseNumber,
		disciplinaId,
		protectedEventId = null, // ID do evento que deve ser protegido da alteração
	) => {
		if (!events[phaseNumber] || !disciplinaId) return;

		// NOVA LÓGICA: Verificar se há terceiro evento noturno separado
		const hasThirdNoturnoSeparado = hasThirdEventNoturnoSeparado(
			disciplinaId,
			phaseNumber,
			events,
		);

		if (hasThirdNoturnoSeparado) {
			// Tratar eventos noturnos e matutinos/vespertinos separadamente
			updateColorsForSeparatedNoturno(
				events,
				phaseNumber,
				disciplinaId,
				protectedEventId,
			);
			return;
		}

		// LÓGICA ORIGINAL: Buscar cor do primeiro período cronológico
		let firstPeriodColor = null;

		const dayOrder = [
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday",
		];
		const allFirstSlots = [
			...firstMatutinoSlots,
			...firstVespertinoSlots,
			...firstNoturnoSlots,
		];

		// PRIORIDADE 1: Buscar nos primeiros períodos ordenados por dia da semana
		// (segunda tem prioridade sobre terça, etc.)
		for (const dayId of dayOrder) {
			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				for (const event of eventsInSlot) {
					if (
						event.disciplinaId === disciplinaId &&
						event.dayId === dayId &&
						allFirstSlots.includes(event.startTime)
					) {
						// Usar cor baseada no dia da semana do primeiro evento encontrado
						firstPeriodColor = getColorByDay(dayId);
						break;
					}
				}
				if (firstPeriodColor) break;
			}
			if (firstPeriodColor) break;
		}

		// PRIORIDADE 2: Se não encontrou nos primeiros períodos, buscar nos segundos períodos
		// ordenados por dia da semana (segunda tem prioridade sobre terça, etc.)
		if (!firstPeriodColor) {
			const allSecondSlots = [
				...secondMatutinoSlots,
				...secondVespertinoSlots,
				...secondNoturnoSlots,
			];

			for (const dayId of dayOrder) {
				for (const [, eventArray] of Object.entries(
					events[phaseNumber],
				)) {
					const eventsInSlot = Array.isArray(eventArray)
						? eventArray
						: [eventArray];
					for (const event of eventsInSlot) {
						if (
							event.disciplinaId === disciplinaId &&
							event.dayId === dayId &&
							allSecondSlots.includes(event.startTime)
						) {
							// Usar cor baseada no dia da semana do primeiro evento encontrado
							firstPeriodColor = getColorByDay(dayId);
							break;
						}
					}
					if (firstPeriodColor) break;
				}
				if (firstPeriodColor) break;
			}
		}

		// Se encontrou cor do primeiro período (ou dos segundos períodos), aplicar em ambos os períodos
		if (firstPeriodColor) {
			const secondSlots = [
				...secondMatutinoSlots,
				...secondVespertinoSlots,
				...secondNoturnoSlots,
			];
			const firstSlots = [
				...firstMatutinoSlots,
				...firstVespertinoSlots,
				...firstNoturnoSlots,
			];

			for (const [eventKey, eventArray] of Object.entries(
				events[phaseNumber],
			)) {
				const eventsInSlot = Array.isArray(eventArray)
					? eventArray
					: [eventArray];
				const updatedEvents = eventsInSlot.map((event) => {
					// 🛡️ PROTEÇÃO GLOBAL: Proteger qualquer evento com o ID protegido
					if (protectedEventId && event.id === protectedEventId) {
						return event; // Manter exatamente como está
					}

					// Atualizar segundos períodos com a cor do primeiro período
					if (
						event.disciplinaId === disciplinaId &&
						secondSlots.includes(event.startTime)
					) {
						return {
							...event,
							color: firstPeriodColor,
						};
					}

					// Atualizar primeiros períodos para manter consistência (usar cor do primeiro dia da semana)
					if (
						event.disciplinaId === disciplinaId &&
						firstSlots.includes(event.startTime)
					) {
						return {
							...event,
							color: firstPeriodColor,
						};
					}

					return event;
				});

				// Preservar estrutura: single event ou array
				if (updatedEvents.length === 1) {
					events[phaseNumber][eventKey] = updatedEvents[0];
				} else {
					events[phaseNumber][eventKey] = updatedEvents;
				}
			}
		}
	};

	// Recebe "wasSaved": true quando o usuário clicou em Salvar; false em cancelamento
	const handleModalClose = useCallback(
		(wasSaved = false) => {
			// Restaurar somente se o usuário CANCELAR (wasSaved = false)
			if (
				!wasSaved &&
				originalEventBackup &&
				selectedEvent &&
				selectedEvent.id === originalEventBackup.id &&
				selectedPhase
			) {
				setEvents((prev) => {
					const newEvents = { ...prev };

					if (!newEvents[selectedPhase]) return prev;

					// Criar nova referência da fase
					newEvents[selectedPhase] = { ...newEvents[selectedPhase] };

					// Encontrar e restaurar o evento
					Object.keys(newEvents[selectedPhase]).forEach((key) => {
						const eventArray = Array.isArray(
							newEvents[selectedPhase][key],
						)
							? newEvents[selectedPhase][key]
							: [newEvents[selectedPhase][key]];

						const updatedEvents = eventArray.map((event) => {
							if (event.id === originalEventBackup.id) {
								return originalEventBackup; // Restaurar estado original
							}
							return event;
						});

						newEvents[selectedPhase][key] =
							updatedEvents.length === 1
								? updatedEvents[0]
								: updatedEvents;
					});

					return newEvents;
				});
			}

			setModalOpen(false);
			setSelectedEvent(null);
			setOriginalEventBackup(null);
		},
		[originalEventBackup, selectedEvent, selectedPhase],
	);

	// Função para gerar e baixar arquivo JSON com os horários
	const generateScheduleJSON = () => {
		try {
			const scheduleData = [];
			let currentId = 1;

			// Percorrer todas as fases e eventos
			Object.keys(events).forEach((phaseNumber) => {
				const phaseEvents = events[phaseNumber];

				Object.keys(phaseEvents).forEach((slotKey) => {
					const eventsInSlot = Array.isArray(phaseEvents[slotKey])
						? phaseEvents[slotKey]
						: [phaseEvents[slotKey]];

					eventsInSlot.forEach((event) => {
						// Verificar se o evento tem dados válidos
						if (!event.disciplinaId || !event.professorId) {
							return; // Pular eventos incompletos
						}

						// Buscar informações da disciplina
						const disciplina = disciplinas.find(
							(d) => d.id === event.disciplinaId,
						);
						if (!disciplina) return;

						// Buscar informações dos professores (pode ter múltiplos)
						let professoresCodigos = [];

						if (
							event.professoresIds &&
							Array.isArray(event.professoresIds)
						) {
							// Formato novo com múltiplos professores
							professoresCodigos = event.professoresIds;
						} else if (event.professorId) {
							// Formato antigo com um professor
							professoresCodigos = [event.professorId];
						}

						if (professoresCodigos.length === 0) return;

						// Determinar o valor de slots baseado no turno
						const isNoturno = isHorarioNoturno(event.startTime);
						const slots = isNoturno ? 2 : 1;

						// Mapear período baseado no horário específico
						let period;
						if (firstMatutinoSlots.includes(event.startTime)) {
							period = 1; // Primeiro período matutino
						} else if (
							secondMatutinoSlots.includes(event.startTime)
						) {
							period = 2; // Segundo período matutino
						} else if (
							firstVespertinoSlots.includes(event.startTime)
						) {
							period = 4; // Primeiro período vespertino
						} else if (
							secondVespertinoSlots.includes(event.startTime)
						) {
							period = 5; // Segundo período vespertino
						} else if (isNoturno) {
							period = 6; // Período noturno único
						} else {
							period = 6; // Default para noturno
						}

						// Para horários noturnos: agrupar todos os professores em uma entrada
						// Para outros turnos: criar entrada separada para cada professor
						if (isNoturno) {
							// Horário noturno: uma entrada com todos os professores
							const scheduleItem = {
								id: currentId++,
								code: disciplina.codigo,
								name: `${disciplina.codigo} - ${disciplina.nome}`,
								credits: 4,
								slots: 2,
								group: parseInt(phaseNumber, 10),
								members: professoresCodigos, // Todos os professores juntos
								weekDay: dayToNumber[event.dayId] + 1,
								period: period,
							};

							scheduleData.push(scheduleItem);
						} else {
							// Horários matutino/vespertino: entrada separada para cada professor
							professoresCodigos.forEach((professorCodigo) => {
								const scheduleItem = {
									id: currentId++,
									code: disciplina.codigo,
									name: `${disciplina.codigo} - ${disciplina.nome}`,
									credits: 4,
									slots: 1,
									group: parseInt(phaseNumber, 10),
									members: [professorCodigo],
									weekDay: dayToNumber[event.dayId] + 1,
									period: period,
								};

								scheduleData.push(scheduleItem);
							});
						}
					});
				});
			});

			// Ordenar por grupo, depois por dia da semana, depois por período
			scheduleData.sort((a, b) => {
				if (a.group !== b.group) return a.group - b.group;
				if (a.weekDay !== b.weekDay) return a.weekDay - b.weekDay;
				return a.period - b.period;
			});

			// Gerar nome do arquivo
			const nomeArquivo = selectedCurso
				? `schedule_${selectedCurso.nome.replace(/\s+/g, "_")}_${
						selectedAnoSemestre.ano
				  }_${selectedAnoSemestre.semestre}.json`
				: `schedule_${selectedAnoSemestre.ano}_${selectedAnoSemestre.semestre}.json`;

			// Criar e baixar arquivo
			const dataStr = JSON.stringify(scheduleData, null, 4);
			const dataBlob = new Blob([dataStr], { type: "application/json" });

			const url = URL.createObjectURL(dataBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = nomeArquivo;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			setSnackbarMessage(
				`Arquivo ${nomeArquivo} baixado com sucesso! (${scheduleData.length} horários)`,
			);
			setSnackbarOpen(true);
		} catch (error) {
			console.error("Erro ao gerar JSON:", error);
			setSnackbarMessage("Erro ao gerar arquivo JSON: " + error.message);
			setSnackbarOpen(true);
		}
	};

	return (
		<Box sx={{ padding: 2 }}>
			<Box
				sx={{
					display: "flex",
					flexDirection: { xs: "column", lg: "row" },
					justifyContent: { xs: "center", lg: "space-between" },
					alignItems: { xs: "center", lg: "center" },
					gap: { xs: 3, lg: 0 },
					mb: 4,
				}}
			>
				{/* Seção do título - sempre no topo em mobile */}
				<Box
					sx={{
						textAlign: { xs: "center", lg: "left" },
						order: { xs: 1, lg: 1 },
					}}
				>
					<Typography
						variant="h4"
						sx={{
							fontSize: {
								xs: "1.75rem",
								sm: "2rem",
								lg: "2.125rem",
							},
						}}
					>
						Grade de Horários
					</Typography>
				</Box>

				{/* Seção dos controles - empilha em mobile, linha em desktop */}
				<Box
					sx={{
						display: "flex",
						flexDirection: { xs: "column", md: "row" },
						alignItems: "center",
						gap: { xs: 2, md: 2 },
						width: { xs: "100%", md: "auto" },
						order: { xs: 2, lg: 2 },
					}}
				>
					{/* Primeira linha de botões em mobile, inline em desktop */}
					<Box
						sx={{
							display: "flex",
							flexDirection: { xs: "column", sm: "row" },
							alignItems: "center",
							gap: 2,
							width: { xs: "100%", sm: "auto" },
						}}
					>
						<Tooltip
							title={
								hasPendingChanges()
									? `Há ${
											getChangesCount().total
									  } mudança(s) não sincronizada(s). Clique para ver opções.`
									: "Recarregar dados do banco de dados"
							}
						>
							<span>
								<Button
									variant="outlined"
									onClick={handleReloadClick}
									disabled={loadingHorarios}
									color={
										hasPendingChanges()
											? "warning"
											: "primary"
									}
									sx={{
										minWidth: { xs: "200px", sm: "140px" },
										width: { xs: "100%", sm: "auto" },
									}}
								>
									{loadingHorarios
										? "Carregando..."
										: hasPendingChanges()
										? "Recarregar*"
										: "Recarregar"}
								</Button>
							</span>
						</Tooltip>

						<Badge
							badgeContent={conflitosHorarios.length}
							color="error"
						>
							<Button
								variant={
									conflitosHorarios.length > 0
										? "contained"
										: "outlined"
								}
								color={
									conflitosHorarios.length > 0
										? "warning"
										: "primary"
								}
								onClick={() => setShowConflitos(true)}
								startIcon={<WarningIcon />}
								sx={{
									minWidth: { xs: "200px", sm: "140px" },
									width: { xs: "100%", sm: "auto" },
								}}
							>
								{conflitosHorarios.length > 0
									? "Ver Conflitos"
									: "Sem Conflitos"}
							</Button>
						</Badge>

						{canManageHorarios && (
							<Button
								variant="contained"
								color="primary"
								onClick={saveAllHorariosToDatabase}
								disabled={
									savingHorarios || !hasPendingChanges()
								}
								startIcon={
									savingHorarios ? (
										<CircularProgress size={20} />
									) : (
										<SaveIcon />
									)
								}
								sx={{
									minWidth: { xs: "200px", sm: "180px" },
									width: { xs: "100%", sm: "auto" },
								}}
							>
								{(() => {
									if (savingHorarios) {
										return "Salvando...";
									}

									const changes = getChangesCount();
									if (changes.total > 0) {
										return `Sincronizar Mudanças (${changes.total})`;
									}

									return "Nenhuma Mudança";
								})()}
							</Button>
						)}

						{canManageHorarios && (
							<Tooltip title="Baixar horários em formato JSON">
								<span>
									<Button
										variant="outlined"
										color="secondary"
										onClick={generateScheduleJSON}
										disabled={
											loadingHorarios ||
											!selectedCurso ||
											getValidHorariosCount() === 0
										}
										startIcon={<DownloadIcon />}
										sx={{
											minWidth: {
												xs: "200px",
												sm: "140px",
											},
											width: { xs: "100%", sm: "auto" },
										}}
									>
										Baixar JSON
									</Button>
								</span>
							</Tooltip>
						)}
					</Box>

					{/* Segunda linha de seletores em mobile, inline em desktop */}
					<Box
						sx={{
							display: "flex",
							flexDirection: { xs: "column", sm: "row" },
							alignItems: "center",
							gap: 2,
							width: { xs: "100%", sm: "auto" },
						}}
					>
						<FormControl
							sx={{
								minWidth: { xs: "100%", sm: 180 },
								width: { xs: "100%", sm: "auto" },
							}}
						>
							<InputLabel>Curso</InputLabel>
							<Select
								value={selectedCurso ? selectedCurso.id : ""}
								onChange={(e) => {
									const curso = cursos.find(
										(c) => c.id === e.target.value,
									);
									setSelectedCurso(curso);
								}}
								label="Curso"
								disabled={loadingCursos || cursos.length === 0}
								startAdornment={
									loadingCursos && (
										<CircularProgress
											size={16}
											sx={{ mr: 1 }}
										/>
									)
								}
							>
								{cursos.map((curso) => (
									<MenuItem key={curso.id} value={curso.id}>
										{curso.nome} ({curso.codigo})
									</MenuItem>
								))}
								{cursos.length === 0 && !loadingCursos && (
									<MenuItem disabled>
										Nenhum curso vinculado ao usuário
									</MenuItem>
								)}
							</Select>
						</FormControl>

						<FormControl
							sx={{
								minWidth: { xs: "100%", sm: 200 },
								width: { xs: "100%", sm: "auto" },
							}}
						>
							<InputLabel>Ano/Semestre</InputLabel>
							<Select
								value={
									anosSemestres.length > 0
										? `${selectedAnoSemestre.ano}-${selectedAnoSemestre.semestre}`
										: ""
								}
								onChange={(e) => {
									const [ano, semestre] =
										e.target.value.split("-");
									setSelectedAnoSemestre({
										ano: parseInt(ano),
										semestre: parseInt(semestre),
									});
								}}
								label="Ano/Semestre"
								disabled={
									loadingAnosSemestres ||
									anosSemestres.length === 0 ||
									loadingHorarios ||
									!selectedCurso
								}
								startAdornment={
									loadingHorarios && (
										<CircularProgress
											size={16}
											sx={{ mr: 1 }}
										/>
									)
								}
							>
								{anosSemestres.map((anoSemestre) => (
									<MenuItem
										key={`${anoSemestre.ano}-${anoSemestre.semestre}`}
										value={`${anoSemestre.ano}-${anoSemestre.semestre}`}
									>
										{anoSemestre.ano}/{anoSemestre.semestre}
										º Semestre
									</MenuItem>
								))}
								{anosSemestres.length === 0 &&
									!loadingAnosSemestres && (
										<MenuItem disabled>
											Nenhum ano/semestre cadastrado
										</MenuItem>
									)}
							</Select>
						</FormControl>

						{/* Controle de Publicação */}
						{selectedCurso &&
							selectedAnoSemestre.ano &&
							selectedAnoSemestre.semestre && (
								<FormControl
									sx={{
										minWidth: { xs: "100%", sm: 160 },
										width: { xs: "100%", sm: "auto" },
									}}
								>
									<InputLabel>Status</InputLabel>
									<Select
										value={(() => {
											const anoSemestreAtual =
												anosSemestres.find(
													(as) =>
														as.ano ===
															selectedAnoSemestre.ano &&
														as.semestre ===
															selectedAnoSemestre.semestre,
												);
											return anoSemestreAtual
												? anoSemestreAtual.publicado
													? "publicado"
													: "rascunho"
												: "rascunho";
										})()}
										onChange={async (e) => {
											if (!canManageHorarios) return; // trava alteração se não tem permissão
											const novoStatus = e.target.value;
											const publicado =
												novoStatus === "publicado";

											try {
												await axiosInstance.patch(
													`/ano-semestre/${selectedAnoSemestre.ano}/${selectedAnoSemestre.semestre}/publicacao`,
													{ publicado },
												);

												// Atualizar estado local dos anos/semestres
												setAnosSemestres((prev) =>
													prev.map((as) =>
														as.ano ===
															selectedAnoSemestre.ano &&
														as.semestre ===
															selectedAnoSemestre.semestre
															? {
																	...as,
																	publicado,
															  }
															: as,
													),
												);

												setSaveSuccess(true);
												setTimeout(
													() => setSaveSuccess(false),
													4000,
												);
											} catch (error) {
												console.error(
													"Erro ao alterar status de publicação:",
													error,
												);
												setSaveError(
													"Erro ao alterar status de publicação: " +
														(error.response?.data
															?.message ||
															error.message),
												);
												setTimeout(
													() => setSaveError(null),
													6000,
												);
											}
										}}
										label="Status"
										disabled={
											loadingAnosSemestres ||
											!selectedCurso ||
											!canManageHorarios
										}
									>
										<MenuItem value="rascunho">
											📝 Rascunho
										</MenuItem>
										<MenuItem value="publicado">
											🌐 Publicado
										</MenuItem>
									</Select>
								</FormControl>
							)}
					</Box>
				</Box>
			</Box>

			{/* Indicador de Status de Publicação */}
			{selectedCurso &&
				selectedAnoSemestre.ano &&
				selectedAnoSemestre.semestre &&
				anosSemestres.length > 0 &&
				(() => {
					const anoSemestreAtual = anosSemestres.find(
						(as) =>
							as.ano === selectedAnoSemestre.ano &&
							as.semestre === selectedAnoSemestre.semestre,
					);

					if (anoSemestreAtual) {
						return (
							<Alert
								severity={
									anoSemestreAtual.publicado
										? "success"
										: "info"
								}
								sx={{
									mb: 2,
									borderLeft: `4px solid ${
										anoSemestreAtual.publicado
											? "#4caf50"
											: "#2196f3"
									}`,
								}}
								icon={anoSemestreAtual.publicado ? "🌐" : "📝"}
							>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										gap: 1,
									}}
								>
									<Typography
										variant="body2"
										fontWeight="bold"
									>
										Status dos Horários:{" "}
										{anoSemestreAtual.publicado
											? "PUBLICADOS"
											: "RASCUNHO"}
									</Typography>
								</Box>
								<Typography
									variant="caption"
									display="block"
									sx={{ mt: 0.5 }}
								>
									{anoSemestreAtual.publicado
										? "Os horários salvos ficam visíveis na interface pública de visualização."
										: "Os horários salvos ficam apenas na interface de construção (não são visíveis publicamente)."}
								</Typography>
							</Alert>
						);
					}
					return null;
				})()}

			{/* Alerts de feedback para salvamento */}
			{saveSuccess && (
				<Alert severity="success" sx={{ mb: 2 }}>
					Horários salvos no banco de dados com sucesso!
				</Alert>
			)}

			{saveError && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{saveError}
				</Alert>
			)}

			{loadError && (
				<Alert
					severity="warning"
					sx={{ mb: 2 }}
					action={
						<Button
							color="inherit"
							size="small"
							onClick={loadHorariosFromDatabase}
						>
							Tentar novamente
						</Button>
					}
				>
					{loadError}
				</Alert>
			)}

			{errorCursos && (
				<Alert
					severity="error"
					sx={{ mb: 2 }}
					action={
						<Button
							color="inherit"
							size="small"
							onClick={fetchCursos}
						>
							Tentar novamente
						</Button>
					}
				>
					{errorCursos}
				</Alert>
			)}

			{errorAnosSemestres && (
				<Alert
					severity="error"
					sx={{ mb: 2 }}
					action={
						<Button
							color="inherit"
							size="small"
							onClick={fetchAnosSemestres}
						>
							Tentar novamente
						</Button>
					}
				>
					{errorAnosSemestres}
				</Alert>
			)}

			{!selectedCurso && !loadingCursos && cursos.length > 0 && (
				<Alert severity="info" sx={{ mb: 2 }}>
					Selecione um curso para visualizar os horários disponíveis.
				</Alert>
			)}

			{!loadingCursos && cursos.length === 0 && !errorCursos && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Nenhum curso vinculado ao usuário '{getCurrentUserId()}'.
					Solicite acesso aos cursos necessários.
				</Alert>
			)}

			{errorOfertas && (
				<Alert
					severity="warning"
					sx={{ mb: 2 }}
					action={
						<Button
							color="inherit"
							size="small"
							onClick={fetchOfertas}
						>
							Tentar novamente
						</Button>
					}
				>
					{errorOfertas}
				</Alert>
			)}

			{loadingCursos ||
			loadingProfessores ||
			loadingDisciplinas ||
			loadingHorarios ||
			loadingAnosSemestres ||
			loadingOfertas ? (
				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						minHeight: "200px",
					}}
				>
					<Box sx={{ textAlign: "center" }}>
						<CircularProgress size={40} sx={{ mb: 2 }} />
						<Typography variant="body1" color="textSecondary">
							{loadingCursos
								? "Carregando cursos do usuário..."
								: loadingProfessores
								? "Carregando dados dos professores..."
								: loadingDisciplinas
								? "Carregando dados das disciplinas..."
								: loadingAnosSemestres
								? "Carregando anos/semestres disponíveis..."
								: loadingOfertas
								? "Carregando ofertas de curso..."
								: "Carregando horários salvos..."}
						</Typography>
						{loadingOfertas && (
							<Typography
								variant="caption"
								color="textSecondary"
								display="block"
								sx={{ mt: 1 }}
							>
								Determinando fases disponíveis para o período...
							</Typography>
						)}
					</Box>
				</Box>
			) : (
				<>
					{(errorProfessores || errorDisciplinas) && (
						<Alert
							severity="warning"
							sx={{ mb: 2 }}
							action={
								<Button
									color="inherit"
									size="small"
									onClick={() => {
										fetchCursos();
										fetchProfessores();
										fetchDisciplinas();
										fetchAnosSemestres();
										if (selectedCurso) {
											fetchOfertas();
										}
									}}
								>
									Tentar novamente
								</Button>
							}
						>
							{errorProfessores || errorDisciplinas}
						</Alert>
					)}

					{/* Verificar se há horários para exibir */}
					{(() => {
						const fasesDisponiveis = getFasesDisponiveis();

						if (
							Object.keys(events).length === 0 &&
							!loadingHorarios &&
							fasesDisponiveis.length > 0
						) {
							return (
								<Alert severity="info" sx={{ mb: 2 }}>
									Nenhum horário encontrado para{" "}
									{selectedAnoSemestre.ano}/
									{selectedAnoSemestre.semestre}º semestre.
									<br />
									Comece criando horários clicando duas vezes
									nas células da grade.
								</Alert>
							);
						}
						return null;
					})()}

					{/* Verificar se há ofertas para o período atual */}
					{(() => {
						const fasesDisponiveis = getFasesDisponiveis();

						if (!loadingOfertas && !loadingHorarios) {
							if (fasesDisponiveis.length === 0) {
								return (
									<Alert severity="error" sx={{ mb: 2 }}>
										Nenhuma oferta de fase cadastrada para{" "}
										{selectedAnoSemestre.ano}/
										{selectedAnoSemestre.semestre}º
										semestre.
										<br />
										<Typography
											variant="body2"
											sx={{ mt: 1, fontWeight: "bold" }}
										>
											Para começar a usar o sistema:
										</Typography>
										<Typography
											variant="caption"
											display="block"
											sx={{ mt: 0.5 }}
										>
											1. Cadastre ofertas de fases via
											API: <code>POST /api/ofertas</code>
											<br />
											2. Defina o turno de cada fase
											(vespertino/noturno)
											<br />
											3. Os grids de horários aparecerão
											automaticamente
										</Typography>
									</Alert>
								);
							}
						}
						return null;
					})()}

					{/* Botão para abrir/fechar Drawer de créditos por docente */}
					<Box
						sx={{
							display: "flex",
							justifyContent: "flex-end",
							mb: 1,
						}}
					>
						<Button
							variant="outlined"
							size="small"
							startIcon={<TableChartIcon />}
							onClick={() => setOpenCreditosDrawer(true)}
						>
							Créditos por Docente
						</Button>
					</Box>

					{/* Mostrar informações sobre fases disponíveis */}
					{(() => {
						const fasesDisponiveis = getFasesDisponiveis();

						if (
							!loadingOfertas &&
							!loadingHorarios &&
							fasesDisponiveis.length > 0
						) {
							return (
								<Alert severity="success" sx={{ mb: 2 }}>
									Exibindo {fasesDisponiveis.length} fase(s)
									conforme ofertas cadastradas:{" "}
									{fasesDisponiveis.join(", ")}ª
									<br />
									<Typography
										variant="caption"
										display="block"
									>
										Para adicionar mais fases, cadastre
										ofertas adicionais na API.
									</Typography>
								</Alert>
							);
						}
						return null;
					})()}

					{/* Campo de datas do ano/semestre selecionado */}
					{selectedCurso &&
						!loadingAnosSemestres &&
						anosSemestres.length > 0 &&
						(() => {
							const anoSemestreAtual = anosSemestres.find(
								(as) =>
									as.ano === selectedAnoSemestre.ano &&
									as.semestre ===
										selectedAnoSemestre.semestre,
							);

							if (
								anoSemestreAtual &&
								(anoSemestreAtual.inicio ||
									anoSemestreAtual.fim)
							) {
								const formatarData = (data) => {
									if (!data) return "Não definida";
									try {
										return new Date(
											data,
										).toLocaleDateString("pt-BR", {
											day: "2-digit",
											month: "2-digit",
											year: "numeric",
										});
									} catch (error) {
										return "Data inválida";
									}
								};

								return (
									<Box
										sx={{
											mb: 3,
											p: 2,
											bgcolor: "background.paper",
											borderRadius: 1,
											border: "1px solid",
											borderColor: "divider",
										}}
									>
										<Typography
											variant="h6"
											sx={{ mb: 1, fontWeight: "medium" }}
										>
											Período Letivo:{" "}
											{selectedAnoSemestre.ano}/
											{selectedAnoSemestre.semestre}º
											Semestre
										</Typography>
										<Box
											sx={{
												display: "flex",
												gap: 4,
												flexWrap: "wrap",
											}}
										>
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													gap: 1,
												}}
											>
												<Typography
													variant="body2"
													color="text.secondary"
													fontWeight="medium"
												>
													Início:
												</Typography>
												<Typography variant="body2">
													{formatarData(
														anoSemestreAtual.inicio,
													)}
												</Typography>
											</Box>
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													gap: 1,
												}}
											>
												<Typography
													variant="body2"
													color="text.secondary"
													fontWeight="medium"
												>
													Fim:
												</Typography>
												<Typography variant="body2">
													{formatarData(
														anoSemestreAtual.fim,
													)}
												</Typography>
											</Box>
										</Box>
									</Box>
								);
							}
							return null;
						})()}

					{selectedCurso &&
						getFasesDisponiveis().map((phaseNumber) => {
							const phaseEvents = events[phaseNumber] || {};
							const eventCount = Object.keys(phaseEvents).length;

							return (
								<PhaseGrid
									key={phaseNumber}
									phaseNumber={phaseNumber}
									isEvenSemester={isEvenSemester}
									events={phaseEvents}
									onDropEvent={handleDropEvent}
									onAddEvent={handleAddEvent}
									onResize={handleResizeEvent}
									onEdit={handleEditEvent}
									onDelete={handleDeleteEvent}
									professores={professores}
									verificarSeEventoTemConflito={
										verificarSeEventoTemConflito
									}
									obterConflitosDoEvento={
										obterConflitosDoEvento
									}
									isPhaseVespertino={isPhaseVespertino}
									isPhaseMatutino={isPhaseMatutino}
									hasMultiplosTurnos={hasMultiplosTurnos}
									hasTurnoEspecifico={hasTurnoEspecifico}
									getTurnosOferta={getTurnosOferta}
								/>
							);
						})}

					<Box sx={{ mt: 3, textAlign: "center" }}>
						<Typography
							variant="caption"
							color="textSecondary"
							display="block"
							sx={{ mb: 1 }}
						>
							Dica: Clique duplo para adicionar • Arraste para
							mover • Use a alça inferior para redimensionar •
							Clique para editar • Botão X para remover
						</Typography>
						<Typography
							variant="caption"
							color="primary"
							fontWeight="bold"
						>
							{(() => {
								const validCount = getValidHorariosCount();
								const changes = getChangesCount();
								const fasesCount = getFasesDisponiveis().length;

								// Obter status de publicação
								const anoSemestreAtual = anosSemestres.find(
									(as) =>
										as.ano === selectedAnoSemestre.ano &&
										as.semestre ===
											selectedAnoSemestre.semestre,
								);
								const statusPublicacao =
									anoSemestreAtual?.publicado
										? "Publicado"
										: "Rascunho";

								let statusText = `Status (${
									selectedCurso
										? `${selectedCurso.nome} - `
										: ""
								}${selectedAnoSemestre.ano}/${
									selectedAnoSemestre.semestre
								}º semestre - ${statusPublicacao}): ${validCount} horários completos`;

								if (changes.total > 0) {
									const changeDetails = [];
									if (changes.added > 0)
										changeDetails.push(
											`${changes.added} novo(s)`,
										);
									if (changes.modified > 0)
										changeDetails.push(
											`${changes.modified} editado(s)`,
										);
									if (changes.removed > 0)
										changeDetails.push(
											`${changes.removed} removido(s)`,
										);

									statusText += ` • ${
										changes.total
									} mudança(s) pendente(s) (${changeDetails.join(
										", ",
									)})`;
								} else {
									statusText += " • Sincronizado com o banco";
								}

								statusText += ` • ${
									fasesCount > 0
										? `${fasesCount} fase(s) disponível(is)`
										: "Nenhuma fase disponível (cadastre ofertas)"
								}`;

								return statusText;
							})()}
						</Typography>
						<Typography
							variant="caption"
							color="textSecondary"
							display="block"
							sx={{ mt: 0.5, fontStyle: "italic" }}
						>
							Horários sem disciplina ou professor não podem ser
							salvos no sistema
						</Typography>
					</Box>
				</>
			)}

			{/* Drawer lateral com tabela de créditos por docente */}
			<Drawer
				anchor="right"
				open={openCreditosDrawer}
				onClose={() => setOpenCreditosDrawer(false)}
			>
				<Box sx={{ width: { xs: 320, sm: 380 }, p: 2 }}>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							mb: 1,
						}}
					>
						<Typography variant="h6" sx={{ fontWeight: "medium" }}>
							Créditos por Docente
						</Typography>
						<IconButton
							size="small"
							onClick={() => setOpenCreditosDrawer(false)}
						>
							<CloseIcon />
						</IconButton>
					</Box>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 1 }}
					>
						{selectedCurso
							? `${selectedCurso.nome}`
							: "Curso não selecionado"}{" "}
						• {selectedAnoSemestre.ano}
					</Typography>
					<Divider sx={{ mb: 2 }} />
					<TableContainer component={Paper}>
						<Table size="small" stickyHeader>
							<TableHead>
								<TableRow>
									<TableCell>Docente</TableCell>
									<TableCell align="right">
										Créditos ({selectedAnoSemestre.semestre}
										º)
									</TableCell>
									<TableCell align="right">
										Média anual
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{linhasCreditos.length === 0 ? (
									<TableRow>
										<TableCell colSpan={3}>
											<Typography
												variant="body2"
												color="text.secondary"
											>
												Nenhum crédito calculado.
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									linhasCreditos.map((linha) => (
										<TableRow key={linha.codigo} hover>
											<TableCell>
												<Typography
													variant="body2"
													fontWeight="medium"
												>
													{linha.nome}
												</Typography>
												<Typography
													variant="caption"
													color="text.secondary"
												>
													{linha.codigo}
												</Typography>
											</TableCell>
											<TableCell align="right">
												{linha.creditosSemestre}
											</TableCell>
											<TableCell align="right">
												{Number.isFinite(
													linha.mediaAnual,
												)
													? linha.mediaAnual.toFixed(
															1,
													  )
													: "0.0"}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			</Drawer>

			<EventModal
				open={modalOpen}
				onClose={handleModalClose}
				event={selectedEvent}
				onSave={handleSaveEvent}
				professores={professores}
				disciplinas={disciplinas}
				events={events}
				selectedPhase={selectedPhase}
				getDisciplinaProfessorFromOtherPeriod={
					getDisciplinaProfessorFromOtherPeriod
				}
				getDisciplinaProfessorFromSamePhase={
					getDisciplinaProfessorFromSamePhase
				}
				verificarConflitoProfessor={verificarConflitoProfessor}
				anosSemestres={anosSemestres}
				selectedAnoSemestre={selectedAnoSemestre}
				selectedCurso={selectedCurso}
				horariosSeOverlapam={horariosSeOverlapam}
				dayToNumber={dayToNumber}
				daysOfWeek={daysOfWeek}
			/>

			{/* Modal de Confirmação para Recarregar */}
			<Dialog
				open={showReloadConfirmation}
				onClose={() => setShowReloadConfirmation(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<WarningIcon color="warning" />
						Recarregar Dados do Banco
					</Box>
				</DialogTitle>
				<DialogContent>
					<Typography variant="body1" sx={{ mb: 2 }}>
						Você possui{" "}
						<strong>{getChangesCount().total} mudança(s)</strong>{" "}
						que ainda não foram sincronizadas com o banco de dados.
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}
					>
						Ao recarregar, todas as mudanças locais serão perdidas e
						os dados serão substituídos pelos do banco.
					</Typography>
					<Typography variant="body2" sx={{ fontWeight: "medium" }}>
						O que deseja fazer?
					</Typography>
				</DialogContent>
				<DialogActions sx={{ p: 2, gap: 1 }}>
					<Button
						onClick={() => setShowReloadConfirmation(false)}
						variant="outlined"
					>
						Cancelar
					</Button>
					<Button
						onClick={() => {
							setShowReloadConfirmation(false);
							loadHorariosFromDatabase();
						}}
						variant="outlined"
						color="error"
						startIcon={<DeleteIcon />}
					>
						Descartar e Recarregar
					</Button>
					{canManageHorarios && (
						<Button
							onClick={handleSyncAndReload}
							variant="contained"
							color="primary"
							startIcon={<SaveIcon />}
							disabled={savingHorarios}
						>
							{savingHorarios
								? "Sincronizando..."
								: "Sincronizar e Recarregar"}
						</Button>
					)}
				</DialogActions>
			</Dialog>

			<ImportModal
				open={showImportModal}
				onClose={handleCloseImportModal}
				anosSemestres={anosSemestres}
				selectedAnoSemestreOrigem={selectedAnoSemestreOrigem}
				onAnoSemestreOrigemChange={setSelectedAnoSemestreOrigem}
				incluirDocentes={incluirDocentes}
				onIncluirDocentesChange={setIncluirDocentes}
				incluirOfertas={incluirOfertas}
				onIncluirOfertasChange={setIncluirOfertas}
				onImport={importarHorarios}
				loading={importLoading}
				error={importError}
				selectedAnoSemestre={selectedAnoSemestre}
			/>

			<ConflitosModal
				open={showConflitos}
				onClose={() => setShowConflitos(false)}
				conflitos={conflitosHorarios}
				professores={professores}
			/>

			<Snackbar
				open={snackbarOpen}
				autoHideDuration={6000}
				onClose={() => setSnackbarOpen(false)}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					onClose={() => setSnackbarOpen(false)}
					severity={
						snackbarMessage.includes("sucesso")
							? "success"
							: "error"
					}
					variant="filled"
					sx={{ width: "100%" }}
				>
					{snackbarMessage}
				</Alert>
			</Snackbar>
		</Box>
	);
}
