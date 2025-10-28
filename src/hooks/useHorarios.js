import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import Permissoes from "../enums/permissoes";
import permissoesService from "../services/permissoesService";
import horariosController from "../controllers/horarios-controller";
import horariosService from "../services/horarios-service";
import docentesService from "../services/docentes-service";
import ccrsService from "../services/ccrs-service";
import ofertasService from "../services/ofertas-service";
import anoSemestreController from "../controllers/ano-semestre-controller";
import usuariosCursosController from "../controllers/usuarios-cursos-controller";
import {
	timeSlotsMatutino,
	timeSlotsVespertino,
	timeSlotsNoturno,
	firstMatutinoSlots,
	secondMatutinoSlots,
	firstVespertinoSlots,
	secondVespertinoSlots,
	firstNoturnoSlots,
	secondNoturnoSlots,
	allNoturnoSlots,
	allMatutinoVespertinoSlots,
	hasThirdEventNoturnoSeparado,
	normalizeTimeFromDB,
	daysOfWeek,
	dayToNumber,
	initialEvents,
	getColorByDay,
	isHorarioNoturno,
	isHorarioMatutinoOuVespertino,
} from "../utils/horariosUtils.js";

export default function useHorarios() {
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

	// Estados principais
	const [selectedAnoSemestre, setSelectedAnoSemestre] = useState({
		ano: new Date().getFullYear(),
		semestre: 1,
	});
	const [selectedCurso, setSelectedCurso] = useState(null);
	const [cursos, setCursos] = useState([]);
	const [loadingCursos, setLoadingCursos] = useState(true);
	const [errorCursos, setErrorCursos] = useState(null);
	const [events, setEvents] = useState(initialEvents);
	const [modalOpen, setModalOpen] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState(null);
	const [selectedPhase, setSelectedPhase] = useState(null);
	const [originalEventBackup, setOriginalEventBackup] = useState(null);
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
	const [hasAutoSelectedAnoSemestre, setHasAutoSelectedAnoSemestre] = useState(false);
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
	const [selectedAnoSemestreOrigem, setSelectedAnoSemestreOrigem] = useState(null);

	// Drawer lateral: Créditos por docente
	const [openCreditosDrawer, setOpenCreditosDrawer] = useState(false);

	// Modal de sumário de alterações
	const [showSumarioModal, setShowSumarioModal] = useState(false);
	const [sumarioAlteracoes, setSumarioAlteracoes] = useState(null);

	// Estado para armazenar créditos do semestre atual por docente
	const creditosSemestreAtualPorDocente = useMemo(() => {
		return horariosController.calcularCreditosSemestreAtual(events, disciplinas);
	}, [events, disciplinas]);

	// Busca do outro semestre no mesmo ano para média anual
	const [creditosOutroSemestre, setCreditosOutroSemestre] = useState(new Map());

	// Helper para verificar se o semestre é par (para compatibilidade)
	const isEvenSemester = selectedAnoSemestre.semestre === 2;

	// Função para obter o ID do usuário atual
	const getCurrentUserId = () => {
		return "gian"; // Usuário de teste
	};

	// Função para buscar cursos da API
	const fetchCursos = useCallback(async () => {
		try {
			setLoadingCursos(true);
			setErrorCursos(null);

			const userId = getCurrentUserId();
			const { cursos: cursosData } =
				await usuariosCursosController.loadCursosByUsuario(userId);

			setCursos(cursosData);

			// Se não há curso selecionado e há cursos disponíveis, selecionar o primeiro
			const cursoSelecionado =
				usuariosCursosController.autoSelectFirstCurso(cursosData, selectedCurso);
			if (cursoSelecionado) {
				setSelectedCurso(cursoSelecionado);
			}
		} catch (error) {
			console.error("Erro ao buscar cursos do usuário:", error);
			if (error.message?.includes("404")) {
				setErrorCursos("Usuário não encontrado ou sem cursos vinculados.");
			} else {
				setErrorCursos("Erro ao carregar cursos disponíveis para o usuário.");
			}
			setCursos([]);
		} finally {
			setLoadingCursos(false);
		}
	}, [selectedCurso]);

	// Função para buscar anos/semestres da API
	const fetchAnosSemestres = useCallback(async () => {
		try {
			setLoadingAnosSemestres(true);
			setErrorAnosSemestres(null);

			const { anosSemestres: anosSemestresData } =
				await anoSemestreController.loadAnosSemestres();

			setAnosSemestres(anosSemestresData);
		} catch (error) {
			console.error("Erro ao buscar anos/semestres:", error);
			setErrorAnosSemestres("Erro ao carregar anos/semestres disponíveis.");
			setAnosSemestres([]);
		} finally {
			setLoadingAnosSemestres(false);
		}
	}, []);

	// Função para buscar professores da API
	const fetchProfessores = useCallback(async () => {
		try {
			setLoadingProfessores(true);
			setErrorProfessores(null);

			const professoresData = await docentesService.getDocentes();
			const professoresFormatados = horariosController.formatProfessores(professoresData);

			setProfessores(professoresFormatados);
		} catch (error) {
			console.error("Erro ao buscar professores:", error);
			setErrorProfessores("Erro ao carregar professores. Usando dados locais.");
		} finally {
			setLoadingProfessores(false);
		}
	}, []);

	// Função para buscar disciplinas (CCRs) da API
	const fetchDisciplinas = useCallback(async () => {
		try {
			setLoadingDisciplinas(true);
			setErrorDisciplinas(null);

			const disciplinasData = await ccrsService.getCCRs();

			setDisciplinas(disciplinasData);
		} catch (error) {
			console.error("Erro ao buscar disciplinas:", error);
			setErrorDisciplinas("Erro ao carregar disciplinas.");
			setDisciplinas([]);
		} finally {
			setLoadingDisciplinas(false);
		}
	}, []);

	// Função para buscar ofertas da API
	const fetchOfertas = useCallback(async () => {
		try {
			setLoadingOfertas(true);
			setErrorOfertas(null);

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

			const ofertasData = await ofertasService.getOfertas(params);

			setOfertas(ofertasData);
		} catch (error) {
			console.error("Erro ao buscar ofertas:", error);
			setErrorOfertas("Erro ao carregar ofertas. Usando lógica padrão de turnos.");
			setOfertas([]);
		} finally {
			setLoadingOfertas(false);
		}
	}, [selectedAnoSemestre, selectedCurso]);

	// Função para converter horário string para minutos desde meia-noite
	const timeToMinutes = useCallback((timeStr) => {
		if (!timeStr || typeof timeStr !== "string") {
			return 0;
		}

		const parts = timeStr.split(":");
		if (parts.length < 2) {
			return 0;
		}

		const hours = parseInt(parts[0], 10);
		const minutes = parseInt(parts[1], 10);

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
	}, []);

	// Função para verificar se dois horários se sobrepõem
	const horariosSeOverlapam = useCallback(
		(horario1, horario2) => {
			if (!horario1?.hora_inicio || !horario2?.hora_inicio) {
				return false;
			}

			if (!horario1?.duracao || !horario2?.duracao) {
				return false;
			}

			let hora1 = normalizeTimeFromDB(horario1.hora_inicio);
			let hora2 = normalizeTimeFromDB(horario2.hora_inicio);

			const inicio1 = timeToMinutes(hora1);
			const fim1 = inicio1 + horario1.duracao * 30;

			const inicio2 = timeToMinutes(hora2);
			const fim2 = inicio2 + horario2.duracao * 30;

			if (isNaN(inicio1) || isNaN(fim1) || isNaN(inicio2) || isNaN(fim2)) {
				return false;
			}

			const hasOverlap = inicio1 < fim2 && inicio2 < fim1;

			if (fim1 === inicio2 || fim2 === inicio1) {
				return false;
			}

			return hasOverlap;
		},
		[timeToMinutes],
	);

	// Função para verificar se um evento específico tem conflitos
	const verificarSeEventoTemConflito = useCallback(
		(evento) => {
			if (!evento || !conflitosHorarios || conflitosHorarios.length === 0) {
				return false;
			}

			const professoresDoEvento =
				evento.professoresIds && Array.isArray(evento.professoresIds)
					? evento.professoresIds.map(String)
					: evento.professorId
					? [String(evento.professorId)]
					: [];

			if (
				professoresDoEvento.length === 0 ||
				!evento.disciplinaId ||
				!evento.startTime ||
				!evento.dayId
			) {
				return false;
			}

			const diaEvento = dayToNumber[evento.dayId];

			return conflitosHorarios.some((conflito) => {
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
		},
		[conflitosHorarios, horariosSeOverlapam],
	);

	// Função para obter conflitos específicos de um evento
	const obterConflitosDoEvento = useCallback(
		(evento) => {
			if (!evento || !conflitosHorarios || conflitosHorarios.length === 0) {
				return [];
			}

			const professoresDoEvento =
				evento.professoresIds && Array.isArray(evento.professoresIds)
					? evento.professoresIds.map(String)
					: evento.professorId
					? [String(evento.professorId)]
					: [];

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
		},
		[conflitosHorarios, horariosSeOverlapam],
	);

	// Função para detectar conflitos de horários entre professores
	const detectarConflitosHorarios = useCallback(async () => {
		try {
			setConflitosHorarios([]);

			// Identificar professores com horários
			const professoresComHorarios = new Set();
			Object.keys(events).forEach((phaseNumber) => {
				const phaseEvents = events[phaseNumber];
				if (phaseEvents) {
					Object.values(phaseEvents).forEach((eventArray) => {
						const eventsInSlot = Array.isArray(eventArray)
							? eventArray
							: [eventArray];
						eventsInSlot.forEach((event) => {
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
									professoresComHorarios.add(event.professorId);
								}
							}
						});
					});
				}
			});

			// Buscar horários salvos de todos os anos/semestres usando o serviço
			const horariosSalvosPorProfessor = {};

			for (const codigoProfessor of professoresComHorarios) {
				if (codigoProfessor !== "sem.professor") {
					try {
						const allHorariosResponse = await Promise.all(
							anosSemestres.map(async (anoSem) => {
								try {
									const result = await horariosService.getHorarios({
										ano: anoSem.ano,
										semestre: anoSem.semestre,
										id_curso: selectedCurso?.id || 1,
									});
									return result.horarios || [];
								} catch (error) {
									console.warn(
										`Erro ao buscar horários para ${anoSem.ano}/${anoSem.semestre}:`,
										error,
									);
									return [];
								}
							}),
						);

						// Filtrar horários do professor e marcar como salvos
						horariosSalvosPorProfessor[codigoProfessor] = allHorariosResponse
							.flat()
							.filter(
								(h) =>
									h.codigo_docente === codigoProfessor &&
									h.id_ccr &&
									!h.permitirConflito,
							)
							.map((h) => ({
								...h,
								uniqueKey: `salvo-${h.id}`,
								eventoId: h.id,
								tipo: "salvo",
							}));
					} catch (error) {
						console.error(
							`Erro ao verificar conflitos para professor ${codigoProfessor}:`,
							error,
						);
					}
				}
			}

			// Usar o controller para processar e detectar conflitos
			const conflitos = horariosController.detectarConflitos(
				events,
				horariosSalvosPorProfessor,
				professores,
				disciplinas,
				anosSemestres,
				selectedAnoSemestre,
				horariosSeOverlapam,
				dayToNumber,
				daysOfWeek,
			);

			setConflitosHorarios(conflitos);
			return conflitos;
		} catch (error) {
			console.error("Erro ao detectar conflitos:", error);
			return [];
		}
	}, [
		events,
		anosSemestres,
		selectedCurso,
		selectedAnoSemestre,
		professores,
		disciplinas,
		horariosSeOverlapam,
	]);

	// Função para mostrar modal com sumário de alterações
	const showSumarioBeforeSync = useCallback(() => {
		const sumario = horariosController.gerarSumarioAlteracoes(
			events,
			originalHorarios,
			selectedAnoSemestre,
			selectedCurso,
			professores,
			disciplinas,
		);

		if (sumario.totais.total === 0) {
			setSaveSuccess(true);
			setTimeout(() => setSaveSuccess(false), 3000);
			return;
		}

		setSumarioAlteracoes(sumario);
		setShowSumarioModal(true);
	}, [events, originalHorarios, selectedAnoSemestre, selectedCurso, professores, disciplinas]);

	// Função para salvar todos os horários no banco de dados (agora interna, chamada após confirmação)
	const executeSyncToDatabase = useCallback(async () => {
		setSavingHorarios(true);
		setSaveError(null);
		setSaveSuccess(false);
		setShowSumarioModal(false);

		try {
			// Preparar dados de sincronização usando o controller
			const { novos, editados, removidosIds, horariosAtuais, hasChanges } =
				horariosController.prepareSyncData(
					events,
					originalHorarios,
					selectedAnoSemestre,
					selectedCurso,
				);

			// Se não há mudanças, não fazer chamada de API
			if (!hasChanges) {
				setSaveSuccess(true);
				setTimeout(() => setSaveSuccess(false), 3000);
				return;
			}

			// Fazer chamada de API para sincronizar
			await horariosService.syncHorarios(novos, editados, removidosIds);

			setSaveSuccess(true);
			setTimeout(() => setSaveSuccess(false), 3000);

			setOriginalHorarios(horariosAtuais);

			await detectarConflitosHorarios();
		} catch (error) {
			console.error("Erro ao sincronizar horários:", error);
			setSaveError(error.message || "Erro ao salvar horários. Tente novamente.");
			setTimeout(() => setSaveError(null), 5000);
		} finally {
			setSavingHorarios(false);
		}
	}, [events, originalHorarios, selectedAnoSemestre, selectedCurso, detectarConflitosHorarios]);

	// Função pública que agora mostra o sumário primeiro
	const saveAllHorariosToDatabase = useCallback(() => {
		showSumarioBeforeSync();
	}, [showSumarioBeforeSync]);

	// Função para contar horários válidos
	const getValidHorariosCount = useCallback(() => {
		return horariosController.getValidHorariosCount(events);
	}, [events]);

	// Função para contar mudanças desde a última sincronização
	const getChangesCount = useCallback(() => {
		return horariosController.getChangesCount(
			events,
			originalHorarios,
			selectedAnoSemestre,
			selectedCurso,
		);
	}, [events, originalHorarios, selectedAnoSemestre, selectedCurso]);

	// Função para verificar se há mudanças pendentes
	const hasPendingChanges = useCallback(() => {
		const changes = getChangesCount();
		return changes.total > 0;
	}, [getChangesCount]);

	// Função para recarregar dados do banco de dados
	const loadHorariosFromDatabase = useCallback(async () => {
		setLoadingHorarios(true);
		setLoadError(null);

		try {
			await fetchOfertas();

			// Fazer chamada de API para buscar horários
			const result = await horariosService.getHorarios({
				ano: selectedAnoSemestre.ano,
				semestre: selectedAnoSemestre.semestre,
				id_curso: selectedCurso?.id || 1,
			});

			const horariosFromDb = result.horarios;

			// Usar o controller para processar os dados
			const processedResult = horariosController.processHorarios(
				horariosFromDb,
				disciplinas,
				professores,
			);

			if (Object.keys(processedResult.events).length === 0) {
				setEvents({});
				setOriginalHorarios([]);

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

			const eventsWithFixedColors = fixEventColorsAfterLoading(processedResult.events);

			setEvents(eventsWithFixedColors);
			setOriginalHorarios(processedResult.originalHorarios);
		} catch (error) {
			console.error("Erro ao recarregar dados:", error);

			if (error.message?.includes("404")) {
				setLoadError("API não está disponível");
			} else if (error.message?.includes("ofertas")) {
				setLoadError("Erro ao carregar ofertas. Verifique a conexão.");
			} else {
				setLoadError(error.message || "Erro ao carregar dados do banco");
			}
			setEvents({});
			setOriginalHorarios([]);
		} finally {
			setLoadingHorarios(false);
		}
	}, [
		selectedAnoSemestre,
		selectedCurso,
		disciplinas,
		professores,
		anosSemestres,
		fetchOfertas,
	]);

	// Função para lidar com o clique do botão recarregar
	const handleReloadClick = useCallback(() => {
		if (hasPendingChanges()) {
			setShowReloadConfirmation(true);
		} else {
			reloadAllData();
		}
	}, [hasPendingChanges]);

	// Função para recarregar todos os dados
	const reloadAllData = useCallback(async () => {
		try {
			setLoadingHorarios(true);
			setLoadError(null);

			await Promise.all([fetchProfessores(), fetchDisciplinas(), fetchOfertas()]);

			await loadHorariosFromDatabase();
		} catch (error) {
			console.error("Erro ao recarregar todos os dados:", error);
			setLoadError("Erro ao recarregar dados. Tente novamente.");
		} finally {
			setLoadingHorarios(false);
		}
	}, [fetchProfessores, fetchDisciplinas, fetchOfertas, loadHorariosFromDatabase]);

	// Função para sincronizar mudanças e depois recarregar
	const handleSyncAndReload = useCallback(async () => {
		try {
			await executeSyncToDatabase();
			setShowReloadConfirmation(false);
			setTimeout(() => {
				reloadAllData();
			}, 500);
		} catch (error) {
			console.error("Erro ao sincronizar antes de recarregar:", error);
			setSnackbarMessage("Erro ao sincronizar. Tente novamente.");
			setSnackbarOpen(true);
			setShowReloadConfirmation(false);
		}
	}, [executeSyncToDatabase, reloadAllData]);

	// Função para importar horários de ano/semestre anterior
	const importarHorarios = useCallback(async () => {
		setImportLoading(true);
		setImportError(null);

		try {
			if (!selectedAnoSemestreOrigem || !selectedCurso) {
				throw new Error("Selecione um ano/semestre de origem e um curso");
			}

			// Fazer chamada de API para importar horários
			const result = await horariosService.importarHorarios(
				selectedAnoSemestreOrigem.ano,
				selectedAnoSemestreOrigem.semestre,
				selectedAnoSemestre.ano,
				selectedAnoSemestre.semestre,
				selectedCurso.id,
				incluirDocentes,
				incluirOfertas,
			);

			const message = `Importação realizada com sucesso! ${
				result.horarios_importados || 0
			} horários e ${result.ofertas_importadas || 0} ofertas criados.`;

			setSnackbarMessage(message);
			setSnackbarOpen(true);
			setShowImportModal(false);

			await loadHorariosFromDatabase();
		} catch (error) {
			console.error("Erro ao importar horários:", error);
			setImportError(
				error.message || "Erro ao importar horários. Verifique a conexão.",
			);
		} finally {
			setImportLoading(false);
		}
	}, [
		selectedAnoSemestreOrigem,
		selectedAnoSemestre,
		selectedCurso,
		incluirDocentes,
		incluirOfertas,
		loadHorariosFromDatabase,
	]);

	// Função para fechar modal de importação
	const handleCloseImportModal = useCallback(() => {
		setShowImportModal(false);
		setImportError(null);
		setIncluirDocentes(false);
		setIncluirOfertas(false);
		setSelectedAnoSemestreOrigem(null);
	}, []);

	// Função para obter turnos de uma fase
	const getTurnosOferta = useCallback(
		(phaseNumber) => {
			if (!ofertas || ofertas.length === 0) {
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

			const ofertasFase = ofertas.filter(
				(o) =>
					o.ano === selectedAnoSemestre.ano &&
					o.semestre === selectedAnoSemestre.semestre &&
					o.fase === phaseNumber &&
					o.id_curso === (selectedCurso?.id || 1),
			);

			if (ofertasFase.length === 0) {
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

			const turnos = ofertasFase
				.map((oferta) => {
					if (oferta && oferta.turno) {
						const turnoValue = oferta.turno.toString().toLowerCase();
						if (turnoValue === "m" || turnoValue === "matutino") {
							return "matutino";
						} else if (turnoValue === "v" || turnoValue === "vespertino") {
							return "vespertino";
						} else if (turnoValue === "n" || turnoValue === "noturno") {
							return "noturno";
						} else {
							return turnoValue;
						}
					}
					return null;
				})
				.filter(Boolean);

			return [...new Set(turnos)];
		},
		[ofertas, selectedAnoSemestre, selectedCurso, isEvenSemester],
	);

	// Função para obter o turno principal de uma fase
	const getTurnoOferta = useCallback(
		(phaseNumber) => {
			const turnos = getTurnosOferta(phaseNumber);
			return turnos[0] || "vespertino";
		},
		[getTurnosOferta],
	);

	// Verifica se uma fase tem múltiplos turnos
	const hasMultiplosTurnos = useCallback(
		(phaseNumber) => {
			const turnos = getTurnosOferta(phaseNumber);
			return turnos.length > 1;
		},
		[getTurnosOferta],
	);

	// Verifica se uma fase tem turno específico
	const hasTurnoEspecifico = useCallback(
		(phaseNumber, turno) => {
			const turnos = getTurnosOferta(phaseNumber);
			return turnos.includes(turno);
		},
		[getTurnosOferta],
	);

	// Função para verificar se uma fase é vespertino
	const isPhaseVespertino = useCallback(
		(phaseNumber) => {
			if (hasMultiplosTurnos(phaseNumber)) {
				return false;
			}
			const turno = getTurnoOferta(phaseNumber);
			return turno === "vespertino";
		},
		[hasMultiplosTurnos, getTurnoOferta],
	);

	// Função para verificar se uma fase é matutino
	const isPhaseMatutino = useCallback(
		(phaseNumber) => {
			if (hasMultiplosTurnos(phaseNumber)) {
				return false;
			}
			const turno = getTurnoOferta(phaseNumber);
			return turno === "matutino";
		},
		[hasMultiplosTurnos, getTurnoOferta],
	);

	// Função para obter fases disponíveis
	const getFasesDisponiveis = useCallback(() => {
		if (!ofertas || ofertas.length === 0) {
			return [];
		}

		const ofertasAtuais = ofertas.filter(
			(o) =>
				o.ano === selectedAnoSemestre.ano &&
				o.semestre === selectedAnoSemestre.semestre &&
				o.id_curso === (selectedCurso?.id || 1),
		);

		if (ofertasAtuais.length === 0) {
			return [];
		}

		const fases = ofertasAtuais.map((o) => o.fase).sort((a, b) => a - b);

		return [...new Set(fases)];
	}, [ofertas, selectedAnoSemestre, selectedCurso]);

	// Função para buscar cor de disciplina (apenas eventos noturnos)
	const getDisciplinaColorFromNoturnoOnly = useCallback(
		(disciplinaId, phaseNumber, events) => {
			if (!disciplinaId || !events[phaseNumber]) return null;

			const dayOrder = [
				"monday",
				"tuesday",
				"wednesday",
				"thursday",
				"friday",
				"saturday",
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
							firstNoturnoSlots.includes(event.startTime)
						) {
							return getColorByDay(dayId);
						}
					}
				}
			}

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

			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray) ? eventArray : [eventArray];
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
		},
		[],
	);

	// Função para buscar cor de disciplina (apenas eventos matutinos/vespertinos)
	const getDisciplinaColorFromMatutinoVespertinoOnly = useCallback(
		(disciplinaId, phaseNumber, events) => {
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

			for (const dayId of dayOrder) {
				for (const [, eventArray] of Object.entries(events[phaseNumber])) {
					const eventsInSlot = Array.isArray(eventArray)
						? eventArray
						: [eventArray];
					for (const event of eventsInSlot) {
						if (
							event.disciplinaId === disciplinaId &&
							event.dayId === dayId &&
							allFirstMatutinoVespertinoSlots.includes(event.startTime)
						) {
							return getColorByDay(dayId);
						}
					}
				}
			}

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
							allSecondMatutinoVespertinoSlots.includes(event.startTime)
						) {
							return getColorByDay(dayId);
						}
					}
				}
			}

			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray) ? eventArray : [eventArray];
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
		},
		[],
	);

	// Função para buscar cor do primeiro período
	const getDisciplinaColorFromFirstPeriod = useCallback(
		(disciplinaId, phaseNumber, events, currentEventStartTime = null) => {
			if (!disciplinaId || !events[phaseNumber]) return null;

			const hasThirdNoturnoSeparado = hasThirdEventNoturnoSeparado(
				disciplinaId,
				phaseNumber,
				events,
			);

			if (hasThirdNoturnoSeparado && currentEventStartTime) {
				if (isHorarioNoturno(currentEventStartTime)) {
					return getDisciplinaColorFromNoturnoOnly(
						disciplinaId,
						phaseNumber,
						events,
					);
				} else {
					return getDisciplinaColorFromMatutinoVespertinoOnly(
						disciplinaId,
						phaseNumber,
						events,
					);
				}
			}

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
							return getColorByDay(dayId);
						}
					}
				}
			}

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
							return getColorByDay(dayId);
						}
					}
				}
			}

			for (const [, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray) ? eventArray : [eventArray];
				for (const event of eventsInSlot) {
					if (event.disciplinaId === disciplinaId && event.color) {
						return event.color;
					}
				}
			}

			return null;
		},
		[getDisciplinaColorFromNoturnoOnly, getDisciplinaColorFromMatutinoVespertinoOnly],
	);

	// Função para corrigir cores após carregamento
	const fixEventColorsAfterLoading = useCallback(
		(eventsFormatted) => {
			Object.keys(eventsFormatted).forEach((phase) => {
				const phaseEvents = eventsFormatted[phase];

				Object.keys(phaseEvents).forEach((slotKey) => {
					const eventsInSlot = Array.isArray(phaseEvents[slotKey])
						? phaseEvents[slotKey]
						: [phaseEvents[slotKey]];

					eventsInSlot.forEach((event) => {
						const firstPeriodColor = getDisciplinaColorFromFirstPeriod(
							event.disciplinaId,
							phase,
							eventsFormatted,
							event.startTime,
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

						if (event.startTime && allFirstSlots.includes(event.startTime)) {
							if (firstPeriodColor) {
								event.color = firstPeriodColor;
							} else {
								event.color = getColorByDay(event.dayId);
							}
						} else if (
							event.startTime &&
							allSecondSlots.includes(event.startTime)
						) {
							if (firstPeriodColor) {
								event.color = firstPeriodColor;
							} else {
								event.color = getColorByDay(event.dayId);
							}
						} else {
							event.color = getColorByDay(event.dayId);
						}
					});
				});
			});

			return eventsFormatted;
		},
		[getDisciplinaColorFromFirstPeriod],
	);

	// Função para obter cor do evento
	const getEventColor = useCallback(
		(dayId, time, disciplinaId, phaseNumber, events) => {
			const firstPeriodColor = getDisciplinaColorFromFirstPeriod(
				disciplinaId,
				phaseNumber,
				events,
				time,
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
				if (firstPeriodColor) {
					return firstPeriodColor;
				}
				return getColorByDay(dayId);
			} else if (allSecondSlots.includes(time)) {
				if (firstPeriodColor) {
					return firstPeriodColor;
				}
				return getColorByDay(dayId);
			}

			return getColorByDay(dayId);
		},
		[getDisciplinaColorFromFirstPeriod],
	);

	// Função para atualizar cores para eventos com terceiro noturno separado
	const updateColorsForSeparatedNoturno = useCallback(
		(events, phaseNumber, disciplinaId, protectedEventId) => {
			const noturnoColor = getDisciplinaColorFromNoturnoOnly(
				disciplinaId,
				phaseNumber,
				events,
			);
			const matutinoVespertinoColor = getDisciplinaColorFromMatutinoVespertinoOnly(
				disciplinaId,
				phaseNumber,
				events,
			);

			for (const [eventKey, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray) ? eventArray : [eventArray];
				const updatedEvents = eventsInSlot.map((event) => {
					if (protectedEventId && event.id === protectedEventId) {
						return event;
					}

					if (event.disciplinaId === disciplinaId) {
						if (isHorarioNoturno(event.startTime)) {
							return {
								...event,
								color: noturnoColor || getColorByDay(event.dayId),
							};
						} else if (isHorarioMatutinoOuVespertino(event.startTime)) {
							return {
								...event,
								color: matutinoVespertinoColor || getColorByDay(event.dayId),
							};
						}
					}

					return event;
				});

				if (updatedEvents.length === 1) {
					events[phaseNumber][eventKey] = updatedEvents[0];
				} else {
					events[phaseNumber][eventKey] = updatedEvents;
				}
			}
		},
		[getDisciplinaColorFromNoturnoOnly, getDisciplinaColorFromMatutinoVespertinoOnly],
	);

	// Função para atualizar cores de disciplinas relacionadas
	const updateRelatedDisciplinaColors = useCallback(
		(events, phaseNumber, disciplinaId, protectedEventId = null) => {
			if (!events[phaseNumber] || !disciplinaId) return;

			const hasThirdNoturnoSeparado = hasThirdEventNoturnoSeparado(
				disciplinaId,
				phaseNumber,
				events,
			);

			if (hasThirdNoturnoSeparado) {
				updateColorsForSeparatedNoturno(
					events,
					phaseNumber,
					disciplinaId,
					protectedEventId,
				);
				return;
			}

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
							firstPeriodColor = getColorByDay(dayId);
							break;
						}
					}
					if (firstPeriodColor) break;
				}
				if (firstPeriodColor) break;
			}

			if (!firstPeriodColor) {
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
								firstPeriodColor = getColorByDay(dayId);
								break;
							}
						}
						if (firstPeriodColor) break;
					}
					if (firstPeriodColor) break;
				}
			}

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

				for (const [eventKey, eventArray] of Object.entries(events[phaseNumber])) {
					const eventsInSlot = Array.isArray(eventArray)
						? eventArray
						: [eventArray];
					const updatedEvents = eventsInSlot.map((event) => {
						if (protectedEventId && event.id === protectedEventId) {
							return event;
						}

						if (
							event.disciplinaId === disciplinaId &&
							secondSlots.includes(event.startTime)
						) {
							return {
								...event,
								color: firstPeriodColor,
							};
						}

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

					if (updatedEvents.length === 1) {
						events[phaseNumber][eventKey] = updatedEvents[0];
					} else {
						events[phaseNumber][eventKey] = updatedEvents;
					}
				}
			}
		},
		[updateColorsForSeparatedNoturno],
	);

	// Função para sincronizar eventos relacionados
	const updateRelatedEvents = useCallback(
		(events, phaseNumber, originalDisciplinaId, updatedEventData, protectedEventId = null) => {
			if (!events[phaseNumber] || !originalDisciplinaId || !updatedEventData) return;

			const hasThirdNoturnoSeparado = hasThirdEventNoturnoSeparado(
				originalDisciplinaId,
				phaseNumber,
				events,
			);

			const currentEventStartTime = updatedEventData.startTime;

			for (const [eventKey, eventArray] of Object.entries(events[phaseNumber])) {
				const eventsInSlot = Array.isArray(eventArray) ? eventArray : [eventArray];

				const updatedEvents = eventsInSlot.map((event) => {
					if (protectedEventId && event.id === protectedEventId) {
						return event;
					}

					if (event.disciplinaId === originalDisciplinaId) {
						if (hasThirdNoturnoSeparado && currentEventStartTime) {
							const isCurrentNoturno = isHorarioNoturno(currentEventStartTime);
							const isEventNoturno = isHorarioNoturno(event.startTime);

							if (isCurrentNoturno !== isEventNoturno) {
								return event;
							}
						}

						return {
							...event,
							disciplinaId: updatedEventData.disciplinaId,
							title: updatedEventData.title,
							id_ccr: updatedEventData.disciplinaId,
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
							comentario: updatedEventData.comentario || "",
						};
					}
					return event;
				});

				if (updatedEvents.length === 1) {
					events[phaseNumber][eventKey] = updatedEvents[0];
				} else {
					events[phaseNumber][eventKey] = updatedEvents;
				}
			}
		},
		[],
	);

	// Handler para arrastar evento
	const handleDropEvent = useCallback(
		(eventData, dayId, time, phaseNumber) => {
			if (!eventData.disciplinaId) {
				setSnackbarMessage(
					"Não é possível mover um horário sem disciplina definida. Complete as informações primeiro.",
				);
				setSnackbarOpen(true);
				return;
			}

			setEvents((prev) => {
				const newEvents = { ...prev };

				Object.keys(newEvents).forEach((phase) => {
					if (newEvents[phase]) {
						Object.keys(newEvents[phase]).forEach((key) => {
							const eventArray = Array.isArray(newEvents[phase][key])
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

				if (!newEvents[phaseNumber]) {
					newEvents[phaseNumber] = {};
				}

				const newKey = `${dayId}-${time}`;

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
					dia_semana: dayToNumber[dayId],
					fase: phaseNumber,
					hora_inicio: time,
				};

				if (newEvents[phaseNumber][newKey]) {
					const existingEvents = Array.isArray(newEvents[phaseNumber][newKey])
						? newEvents[phaseNumber][newKey]
						: [newEvents[phaseNumber][newKey]];
					newEvents[phaseNumber][newKey] = [...existingEvents, updatedEvent];
				} else {
					newEvents[phaseNumber][newKey] = updatedEvent;
				}

				if (eventData.disciplinaId) {
					updateRelatedDisciplinaColors(
						newEvents,
						phaseNumber,
						eventData.disciplinaId,
					);
				}

				return newEvents;
			});
		},
		[getEventColor, updateRelatedDisciplinaColors],
	);

	// Handler para redimensionar evento
	const handleResizeEvent = useCallback(
		(eventId, newDuration, phaseNumber) => {
			setEvents((prev) => {
				const newEvents = { ...prev };

				if (newEvents[phaseNumber]) {
					Object.keys(newEvents[phaseNumber]).forEach((key) => {
						const eventArray = Array.isArray(newEvents[phaseNumber][key])
							? newEvents[phaseNumber][key]
							: [newEvents[phaseNumber][key]];
						const updatedEvents = eventArray.map((event) => {
							if (event.id === eventId) {
								const temMultiplosTurnos = hasMultiplosTurnos(phaseNumber);

								let timeSlots;
								if (temMultiplosTurnos) {
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
									const isMatutino = isPhaseMatutino(phaseNumber);
									const isVespertino = isPhaseVespertino(phaseNumber);

									if (isMatutino) {
										timeSlots = timeSlotsMatutino;
									} else if (isVespertino) {
										timeSlots = timeSlotsVespertino;
									} else {
										timeSlots = timeSlotsNoturno;
									}
								}

								const startIndex = timeSlots.indexOf(event.startTime);
								let maxDuration = 0;

								if (startIndex >= 0) {
									maxDuration = timeSlots.length - startIndex;
								} else {
									maxDuration = timeSlots.length;
								}

								return {
									...event,
									duration: Math.max(1, Math.min(newDuration, maxDuration)),
								};
							}
							return event;
						});

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
		[hasMultiplosTurnos, getTurnosOferta, isPhaseMatutino, isPhaseVespertino],
	);

	// Handler para adicionar evento
	const handleAddEvent = useCallback(
		(dayId, time, phaseNumber) => {
			const temMultiplosTurnos = hasMultiplosTurnos(phaseNumber);

			const isHorarioMatutino = timeSlotsMatutino.includes(time);
			const isHorarioVespertino = timeSlotsVespertino.includes(time);
			const isHorarioNoturno = timeSlotsNoturno.includes(time);

			const isMatutino = isPhaseMatutino(phaseNumber);
			const isVespertino = isPhaseVespertino(phaseNumber);

			let defaultDuration = 2;

			if (isHorarioMatutino) {
				const timeIndex = timeSlotsMatutino.indexOf(time);

				if (timeIndex >= 0 && timeIndex < 5) {
					defaultDuration = 5;
				} else if (timeIndex >= 5) {
					time = "10:00:00";
					defaultDuration = 4;
				}
			} else if (isHorarioVespertino) {
				const timeIndex = timeSlotsVespertino.indexOf(time);

				if (timeIndex >= 0 && timeIndex < 5) {
					defaultDuration = 5;
				} else if (timeIndex >= 5) {
					time = "16:00:00";
					defaultDuration = 4;
				}
			} else if (isHorarioNoturno) {
				const timeIndex = timeSlotsNoturno.indexOf(time);

				if (timeIndex === 0) {
					defaultDuration = 7;
				} else {
					const maxDurationToLimit = Math.min(
						timeSlotsNoturno.length - timeIndex,
						7 - timeIndex,
					);
					defaultDuration = maxDurationToLimit;
				}
			}

			const defaultColor = getColorByDay(dayId);
			const ano = selectedAnoSemestre.ano;
			const semestre = selectedAnoSemestre.semestre;

			const newEventId = `horario-${phaseNumber}-${Date.now()}-prof1`;
			const newEvent = {
				id: newEventId,
				title: "",
				startTime: time,
				duration: defaultDuration,
				color: defaultColor,
				professorId: "",
				disciplinaId: null,
				dayId: dayId,
				id_curso: selectedCurso?.id || 1,
				id_ccr: null,
				codigo_docente: "",
				dia_semana: dayToNumber[dayId],
				ano: ano,
				semestre: semestre,
				fase: phaseNumber,
				hora_inicio: time,
				duracao: defaultDuration,
				comentario: "",
			};

			setSelectedEvent(newEvent);
			setSelectedPhase(phaseNumber);
			setModalOpen(true);
		},
		[
			hasMultiplosTurnos,
			isPhaseMatutino,
			isPhaseVespertino,
			selectedAnoSemestre,
			selectedCurso,
		],
	);

	// Handler para editar evento
	const handleEditEvent = useCallback((event, phaseNumber) => {
		setOriginalEventBackup(JSON.parse(JSON.stringify(event)));
		setSelectedEvent(event);
		setSelectedPhase(phaseNumber);
		setModalOpen(true);
	}, []);

	// Handler para deletar evento
	const handleDeleteEvent = useCallback((eventId, phaseNumber) => {
		setEvents((prev) => {
			const newEvents = { ...prev };

			if (!newEvents[phaseNumber]) {
				return newEvents;
			}

			newEvents[phaseNumber] = { ...newEvents[phaseNumber] };

			Object.keys(newEvents[phaseNumber]).forEach((key) => {
				const eventArray = Array.isArray(newEvents[phaseNumber][key])
					? newEvents[phaseNumber][key]
					: [newEvents[phaseNumber][key]];

				const filteredEvents = eventArray.filter((event) => event.id !== eventId);

				if (filteredEvents.length === 0) {
					delete newEvents[phaseNumber][key];
				} else if (filteredEvents.length === 1) {
					newEvents[phaseNumber][key] = filteredEvents[0];
				} else {
					newEvents[phaseNumber][key] = filteredEvents;
				}
			});

			return newEvents;
		});
	}, []);

	// Handler para salvar evento
	const handleSaveEvent = useCallback(
		(eventData) => {
			if (!eventData.disciplinaId) {
				console.error("Tentativa de salvar evento sem disciplina:", eventData);
				setSnackbarMessage(
					"Erro: Não é possível salvar um horário sem disciplina definida.",
				);
				setSnackbarOpen(true);
				return;
			}

			const hasProfessores =
				(eventData.professoresIds &&
					Array.isArray(eventData.professoresIds) &&
					eventData.professoresIds.length > 0) ||
				eventData.professorId;
			if (!hasProfessores) {
				console.error("Tentativa de salvar evento sem professor:", eventData);
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

				let eventExists = false;
				let existingEventKey = null;
				let originalDisciplinaId = null;

				Object.keys(newEvents[selectedPhase]).forEach((key) => {
					const eventArray = Array.isArray(newEvents[selectedPhase][key])
						? newEvents[selectedPhase][key]
						: [newEvents[selectedPhase][key]];
					if (eventArray.some((event) => event.id === eventData.id)) {
						eventExists = true;
						existingEventKey = key;
						const originalEvent = eventArray.find(
							(event) => event.id === eventData.id,
						);
						if (originalEvent) {
							originalDisciplinaId = originalEvent.disciplinaId;
						}
					}
				});

				if (eventExists) {
					const eventArray = Array.isArray(newEvents[selectedPhase][existingEventKey])
						? newEvents[selectedPhase][existingEventKey]
						: [newEvents[selectedPhase][existingEventKey]];

					const updatedEvents = eventArray.map((event) => {
						if (event.id === eventData.id) {
							const ano = selectedAnoSemestre.ano;
							const semestre = selectedAnoSemestre.semestre;

							// Obter lista de professores
							const professoresAtuais = eventData.professoresIds ||
								[eventData.professorId].filter(Boolean);

							// Obter histórico de IDs originais para manter os sufixos corretos
							const historicoIds = eventArray
								.map(e => e.id)
								.filter(Boolean);

							// Função para determinar sufixo correto baseado nas regras
							const determineSuffix = (profIndex, professoresAtuais) => {
								// Se é o primeiro professor (índice 0), sempre recebe -prof1
								if (profIndex === 0) {
									return '-prof1';
								}
								// Se já existe um -prof1 e este é o segundo professor
								if (professoresAtuais.length === 2 && profIndex === 1) {
									return '-prof2';
								}
								// Por padrão, sempre usar -prof1
								return '-prof1';
							};

							// Extrair ID base (sem sufixo)
							const baseId = event.id.replace(/-prof\d+$/, "");

							// Para o primeiro evento do slot (que é sempre editado aqui),
							// usar -prof1
							const updatedId = `${baseId}-prof1`;

							const updatedEvent = {
								...event,
								id: updatedId,
								title: eventData.title || "",
								disciplinaId: eventData.disciplinaId,
								professoresIds: professoresAtuais,
								professorId: professoresAtuais[0] || "",
								comentario: eventData.comentario || "",
								permitirConflito: eventData.permitirConflito || false,
								startTime: eventData.startTime || event.startTime,
								duration: eventData.duration || event.duration,
								dayId: eventData.dayId || event.dayId,
								color: event.color,
								id_ccr: eventData.disciplinaId || eventData.id_ccr,
								codigo_docente: professoresAtuais[0] || eventData.codigo_docente,
								dia_semana: dayToNumber[eventData.dayId] || eventData.dia_semana,
								ano: ano,
								semestre: semestre,
								fase: selectedPhase,
								hora_inicio: eventData.startTime || eventData.hora_inicio,
								duracao: eventData.duration || eventData.duracao,
							};

							return updatedEvent;
						}
						return event;
					});

					newEvents[selectedPhase] = { ...newEvents[selectedPhase] };

					if (updatedEvents.length === 1) {
						newEvents[selectedPhase][existingEventKey] = { ...updatedEvents[0] };
					} else {
						newEvents[selectedPhase][existingEventKey] = updatedEvents.map(
							(event) => ({ ...event }),
						);
					}
				} else {
					const newKey = `${eventData.dayId}-${eventData.startTime}`;
					const ano = selectedAnoSemestre.ano;
					const semestre = selectedAnoSemestre.semestre;

					const newEvent = {
						...eventData,
						color: getColorByDay(eventData.dayId),
						duration: eventData.duration || 2,
						id_curso: selectedCurso?.id || 1,
						id_ccr: eventData.disciplinaId || eventData.id_ccr,
						codigo_docente:
							eventData.professoresIds?.[0] ||
							eventData.professorId ||
							eventData.codigo_docente,
						dia_semana: dayToNumber[eventData.dayId] || eventData.dia_semana,
						ano: ano,
						semestre: semestre,
						fase: selectedPhase,
						hora_inicio: eventData.startTime || eventData.hora_inicio,
						duracao: eventData.duration || eventData.duracao,
						comentario: eventData.comentario || "",
						permitirConflito: eventData.permitirConflito || false,
					};

					newEvents[selectedPhase] = { ...newEvents[selectedPhase] };

					if (newEvents[selectedPhase][newKey]) {
						const existingEvents = Array.isArray(newEvents[selectedPhase][newKey])
							? newEvents[selectedPhase][newKey]
							: [newEvents[selectedPhase][newKey]];
						newEvents[selectedPhase][newKey] = [...existingEvents, newEvent];
					} else {
						newEvents[selectedPhase][newKey] = newEvent;
					}
				}

				if (eventData.disciplinaId) {
					updateRelatedDisciplinaColors(
						newEvents,
						selectedPhase,
						eventData.disciplinaId,
					);

					const disciplinaParaSincronizar =
						eventExists && originalDisciplinaId
							? originalDisciplinaId
							: eventData.disciplinaId;
					updateRelatedEvents(
						newEvents,
						selectedPhase,
						disciplinaParaSincronizar,
						eventData,
						eventData.id,
					);
				}

				return newEvents;
			});

			setOriginalEventBackup(null);
		},
		[
			selectedPhase,
			selectedAnoSemestre,
			selectedCurso,
			updateRelatedDisciplinaColors,
			updateRelatedEvents,
		],
	);

	// Handler para fechar modal
	const handleModalClose = useCallback(
		(wasSaved = false) => {
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

					newEvents[selectedPhase] = { ...newEvents[selectedPhase] };

					Object.keys(newEvents[selectedPhase]).forEach((key) => {
						const eventArray = Array.isArray(newEvents[selectedPhase][key])
							? newEvents[selectedPhase][key]
							: [newEvents[selectedPhase][key]];

						const updatedEvents = eventArray.map((event) => {
							if (event.id === originalEventBackup.id) {
								return originalEventBackup;
							}
							return event;
						});

						newEvents[selectedPhase][key] =
							updatedEvents.length === 1 ? updatedEvents[0] : updatedEvents;
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

	// Função para gerar JSON dos horários
	const generateScheduleJSON = useCallback(() => {
		try {
			const scheduleData = [];
			let currentId = 1;

			Object.keys(events).forEach((phaseNumber) => {
				const phaseEvents = events[phaseNumber];

				Object.keys(phaseEvents).forEach((slotKey) => {
					const eventsInSlot = Array.isArray(phaseEvents[slotKey])
						? phaseEvents[slotKey]
						: [phaseEvents[slotKey]];

					eventsInSlot.forEach((event) => {
						if (!event.disciplinaId || !event.professorId) {
							return;
						}

						const disciplina = disciplinas.find((d) => d.id === event.disciplinaId);
						if (!disciplina) return;

						let professoresCodigos = [];

						if (event.professoresIds && Array.isArray(event.professoresIds)) {
							professoresCodigos = event.professoresIds;
						} else if (event.professorId) {
							professoresCodigos = [event.professorId];
						}

						if (professoresCodigos.length === 0) return;

						const isNoturno = isHorarioNoturno(event.startTime);
						const slots = isNoturno ? 2 : 1;

						let period;
						if (firstMatutinoSlots.includes(event.startTime)) {
							period = 1;
						} else if (secondMatutinoSlots.includes(event.startTime)) {
							period = 2;
						} else if (firstVespertinoSlots.includes(event.startTime)) {
							period = 4;
						} else if (secondVespertinoSlots.includes(event.startTime)) {
							period = 5;
						} else if (isNoturno) {
							period = 6;
						} else {
							period = 6;
						}

						if (isNoturno) {
							const scheduleItem = {
								id: currentId++,
								code: disciplina.codigo,
								name: `${disciplina.codigo} - ${disciplina.nome}`,
								credits: 4,
								slots: 2,
								group: parseInt(phaseNumber, 10),
								members: professoresCodigos,
								weekDay: dayToNumber[event.dayId] + 1,
								period: period,
							};

							scheduleData.push(scheduleItem);
						} else {
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

			scheduleData.sort((a, b) => {
				if (a.group !== b.group) return a.group - b.group;
				if (a.weekDay !== b.weekDay) return a.weekDay - b.weekDay;
				return a.period - b.period;
			});

			const nomeArquivo = selectedCurso
				? `schedule_${selectedCurso.nome.replace(/\s+/g, "_")}_${
						selectedAnoSemestre.ano
				  }_${selectedAnoSemestre.semestre}.json`
				: `schedule_${selectedAnoSemestre.ano}_${selectedAnoSemestre.semestre}.json`;

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
	}, [events, disciplinas, selectedCurso, selectedAnoSemestre]);

	// Linhas da tabela de créditos
	const linhasCreditos = useMemo(() => {
		const docentesKeys = new Set(
			Array.from(creditosSemestreAtualPorDocente.keys()),
		);
		const docentesMap = new Map(
			professores.map((p) => [String(p.codigo || p.id), p]),
		);
		const linhas = Array.from(docentesKeys).map((cod) => {
			const atual = creditosSemestreAtualPorDocente.get(String(cod)) || 0;
			const outro = creditosOutroSemestre.get(String(cod)) || 0;
			const numSemestres = (atual > 0 ? 1 : 0) + (outro > 0 ? 1 : 0);
			const mediaAnual = numSemestres > 0 ? (atual + outro) / numSemestres : 0;
			const prof = docentesMap.get(String(cod));
			return {
				codigo: String(cod),
				nome: prof?.name || prof?.nome || String(cod),
				creditosSemestre: atual,
				mediaAnual,
			};
		});
		linhas.sort((a, b) => a.nome.localeCompare(b.nome));
		return linhas;
	}, [creditosSemestreAtualPorDocente, creditosOutroSemestre, professores]);

	// useEffect para buscar dados iniciais
	useEffect(() => {
		fetchCursos();
		fetchProfessores();
		fetchDisciplinas();
		fetchAnosSemestres();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// useEffect para auto-selecionar ano/semestre
	useEffect(() => {
		const autoSelect = async () => {
			if (hasAutoSelectedAnoSemestre) return;
			if (!Array.isArray(anosSemestres) || anosSemestres.length === 0) return;
			if (!selectedCurso || !selectedCurso.id) return;

			try {
				const result = await anoSemestreController.autoSelectAnoSemestre(
					anosSemestres,
					selectedCurso,
				);

				if (result) {
					setSelectedAnoSemestre(result);
				}
			} finally {
				setHasAutoSelectedAnoSemestre(true);
			}
		};

		autoSelect();
	}, [anosSemestres.length, selectedCurso?.id, hasAutoSelectedAnoSemestre]);

	// useEffect para carregar horários
	useEffect(() => {
		if (
			disciplinas.length > 0 &&
			selectedCurso &&
			selectedAnoSemestre.ano &&
			selectedAnoSemestre.semestre
		) {
			setEvents({});
			setOriginalHorarios([]);
			loadHorariosFromDatabase();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [disciplinas.length, selectedCurso?.id, selectedAnoSemestre.ano, selectedAnoSemestre.semestre]);

	// useEffect para recarregar ofertas
	useEffect(() => {
		if (selectedCurso && selectedAnoSemestre.ano && selectedAnoSemestre.semestre) {
			fetchOfertas();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCurso?.id, selectedAnoSemestre.ano, selectedAnoSemestre.semestre]);

	// useEffect para limpar erro de carregamento
	useEffect(() => {
		setLoadError(null);
	}, [selectedAnoSemestre.ano, selectedAnoSemestre.semestre]);

	// useEffect para detectar conflitos
	useEffect(() => {
		const detectConflicts = async () => {
			if (
				professores.length > 0 &&
				disciplinas.length > 0 &&
				anosSemestres.length > 0
			) {
				await detectarConflitosHorarios();
			}
		};

		detectConflicts();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [events, professores.length, disciplinas.length, anosSemestres.length]);

	// useEffect para carregar créditos do outro semestre
	useEffect(() => {
		const carregarOutroSemestre = async () => {
			try {
				if (!selectedCurso?.id || !selectedAnoSemestre?.ano) {
					setCreditosOutroSemestre(new Map());
					return;
				}
				const outroSemestre = selectedAnoSemestre.semestre === 1 ? 2 : 1;

				// Fazer chamada de API para buscar horários do outro semestre
				const result = await horariosService.getHorarios({
					ano: selectedAnoSemestre.ano,
					semestre: outroSemestre,
					id_curso: selectedCurso.id,
				});

				// Usar o controller para calcular créditos a partir dos horários
				const mapa = horariosController.calcularCreditosOutroSemestre(
					result.horarios,
					disciplinas,
				);
				setCreditosOutroSemestre(mapa);
			} catch (e) {
				console.error("Erro ao carregar créditos do outro semestre:", e);
				setCreditosOutroSemestre(new Map());
			}
		};

		carregarOutroSemestre();
	}, [selectedCurso?.id, selectedAnoSemestre.ano, selectedAnoSemestre.semestre, disciplinas.length]);

	return {
		// Estados
		canManageHorarios,
		selectedAnoSemestre,
		setSelectedAnoSemestre,
		selectedCurso,
		setSelectedCurso,
		cursos,
		loadingCursos,
		errorCursos,
		events,
		setEvents,
		modalOpen,
		setModalOpen,
		selectedEvent,
		setSelectedEvent,
		selectedPhase,
		setSelectedPhase,
		professores,
		loadingProfessores,
		errorProfessores,
		disciplinas,
		loadingDisciplinas,
		errorDisciplinas,
		savingHorarios,
		saveSuccess,
		setSaveSuccess,
		saveError,
		setSaveError,
		loadingHorarios,
		loadError,
		setLoadError,
		anosSemestres,
		setAnosSemestres,
		loadingAnosSemestres,
		errorAnosSemestres,
		conflitosHorarios,
		showConflitos,
		setShowConflitos,
		ofertas,
		loadingOfertas,
		errorOfertas,
		snackbarMessage,
		setSnackbarMessage,
		snackbarOpen,
		setSnackbarOpen,
		showReloadConfirmation,
		setShowReloadConfirmation,
		showImportModal,
		setShowImportModal,
		importLoading,
		importError,
		incluirDocentes,
		setIncluirDocentes,
		incluirOfertas,
		setIncluirOfertas,
		selectedAnoSemestreOrigem,
		setSelectedAnoSemestreOrigem,
		openCreditosDrawer,
		setOpenCreditosDrawer,
		linhasCreditos,
		isEvenSemester,
		originalHorarios,
		showSumarioModal,
		setShowSumarioModal,
		sumarioAlteracoes,

		// Funções
		getCurrentUserId,
		fetchCursos,
		fetchProfessores,
		fetchDisciplinas,
		fetchOfertas,
		fetchAnosSemestres,
		verificarSeEventoTemConflito,
		obterConflitosDoEvento,
		detectarConflitosHorarios,
		saveAllHorariosToDatabase,
		executeSyncToDatabase,
		getValidHorariosCount,
		getChangesCount,
		hasPendingChanges,
		handleReloadClick,
		reloadAllData,
		handleSyncAndReload,
		loadHorariosFromDatabase,
		importarHorarios,
		handleCloseImportModal,
		getTurnosOferta,
		getTurnoOferta,
		hasMultiplosTurnos,
		hasTurnoEspecifico,
		isPhaseVespertino,
		isPhaseMatutino,
		getFasesDisponiveis,
		handleDropEvent,
		handleResizeEvent,
		handleAddEvent,
		handleEditEvent,
		handleDeleteEvent,
		handleSaveEvent,
		handleModalClose,
		generateScheduleJSON,
		horariosSeOverlapam,
	};
}

