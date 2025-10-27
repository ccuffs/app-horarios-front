import React, { useState, useEffect } from "react";
import {
	Typography,
	Box,
	CircularProgress,
	Alert,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
} from "@mui/material";
import publicAxiosInstance from "../auth/publicAxios.js";
import PhaseGridView from "./horarios/PhaseGridView";
import {
	dbToEventFormat,
	normalizeTimeFromDB,
	fixEventColorsAfterLoading,
	initialEvents,
} from "./horarios/utils";

export default function HorariosView() {
	const [selectedAnoSemestre, setSelectedAnoSemestre] = useState({
		ano: new Date().getFullYear(),
		semestre: 1,
	});
	const [selectedCurso, setSelectedCurso] = useState(null);
	const [cursos, setCursos] = useState([]);
	const [loadingCursos, setLoadingCursos] = useState(true);
	const [errorCursos, setErrorCursos] = useState(null);
	const [events, setEvents] = useState(initialEvents);
	const [professores, setProfessores] = useState([]);
	const [loadingProfessores, setLoadingProfessores] = useState(true);
	const [disciplinas, setDisciplinas] = useState([]);
	const [loadingDisciplinas, setLoadingDisciplinas] = useState(true);
	const [loadingHorarios, setLoadingHorarios] = useState(false);
	const [loadError, setLoadError] = useState(null);
	const [anosSemestres, setAnosSemestres] = useState([]);
	const [loadingAnosSemestres, setLoadingAnosSemestres] = useState(true);
	const [ofertas, setOfertas] = useState([]);
	const [loadingOfertas, setLoadingOfertas] = useState(true);

	// Função para buscar cursos
	const fetchCursos = async () => {
		try {
			setLoadingCursos(true);
			setErrorCursos(null);
			const response = await publicAxiosInstance.get("/cursos");
			const cursosData = response.cursos || [];
			setCursos(cursosData);

			if (!selectedCurso && cursosData.length > 0) {
				setSelectedCurso(cursosData[0]);
			}
		} catch (error) {
			console.error("Erro ao buscar cursos:", error);
			setErrorCursos("Erro ao carregar cursos disponíveis.");
			setCursos([]);
		} finally {
			setLoadingCursos(false);
		}
	};

	// Função para buscar anos/semestres
	const fetchAnosSemestres = async () => {
		try {
			setLoadingAnosSemestres(true);
			const response = await publicAxiosInstance.get("/ano-semestre");
			const anosSemestresData = response.anosSemestres || [];
			setAnosSemestres(anosSemestresData);

			if (anosSemestresData.length > 0) {
				const anoSemestreExiste = anosSemestresData.some(
					(as) =>
						as.ano === selectedAnoSemestre.ano &&
						as.semestre === selectedAnoSemestre.semestre,
				);

				if (!anoSemestreExiste) {
					const maisRecente = anosSemestresData[0];
					setSelectedAnoSemestre({
						ano: maisRecente.ano,
						semestre: maisRecente.semestre,
					});
				}
			}
		} catch (error) {
			console.error("Erro ao buscar anos/semestres:", error);
			setAnosSemestres([]);
		} finally {
			setLoadingAnosSemestres(false);
		}
	};

	// Função para buscar professores
	const fetchProfessores = async () => {
		try {
			setLoadingProfessores(true);
			const response = await publicAxiosInstance.get("/docentes");
			const professoresFormatados = response.docentes.map((prof) => ({
				id: prof.codigo,
				codigo: prof.codigo,
				nome: prof.nome,
				email: prof.email,
			}));
			setProfessores(professoresFormatados);
		} catch (error) {
			console.error("Erro ao buscar professores:", error);
			setProfessores([]);
		} finally {
			setLoadingProfessores(false);
		}
	};

	// Função para buscar disciplinas
	const fetchDisciplinas = async () => {
		try {
			setLoadingDisciplinas(true);
			const response = await publicAxiosInstance.get("/ccrs");
			const disciplinas = response.ccrs || [];
			setDisciplinas(disciplinas);
		} catch (error) {
			console.error("Erro ao buscar disciplinas:", error);
			setDisciplinas([]);
		} finally {
			setLoadingDisciplinas(false);
		}
	};

	// Função para buscar ofertas
	const fetchOfertas = async () => {
		try {
			setLoadingOfertas(true);
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
				params.id_curso = selectedCurso.id;
			}

			const response = await publicAxiosInstance.get("/ofertas", {
				params,
			});
			const ofertasData = response.ofertas || [];
			setOfertas(ofertasData);
		} catch (error) {
			console.error("Erro ao buscar ofertas:", error);
			setOfertas([]);
		} finally {
			setLoadingOfertas(false);
		}
	};

	// Função para carregar horários
	const loadHorariosFromDatabase = async () => {
		setLoadingHorarios(true);
		setLoadError(null);

		try {
			const response = await publicAxiosInstance.get("/horarios", {
				params: {
					ano: selectedAnoSemestre.ano,
					semestre: selectedAnoSemestre.semestre,
					id_curso: selectedCurso?.id || 1,
					apenas_publicados: "true", // Só mostrar horários publicados na visualização
				},
			});

			const horariosFromDb = response.horarios || [];

			if (horariosFromDb.length === 0) {
				setEvents({});
				return;
			}

			const eventsFormatted = {};

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

				const key = `${horario.id_ccr}-${horario.dia_semana}-${horaInicio}`;

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
					event.professoresIds = grupo.map((h) => h.codigo_docente);
					event.professorId = grupo[0].codigo_docente; // Compatibilidade
				} else {
					event.professoresIds = [baseHorario.codigo_docente];
					event.professorId = baseHorario.codigo_docente;
				}

				// Usar a fase do banco apenas para posicionamento inicial na tela
				const phase = baseHorario.fase || 1;

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
					// Se não existe, criar como objeto único (não array)
					eventsFormatted[phase][slotKey] = event;
				}
			});

			// Corrigir cores após carregamento dos dados
			const eventsFormattedFixed =
				fixEventColorsAfterLoading(eventsFormatted);

			setEvents(eventsFormattedFixed);
		} catch (error) {
			if (error.response?.status === 404) {
				setLoadError(
					"Nenhum horário encontrado para este curso/período",
				);
			} else {
				setLoadError("Erro ao carregar horários");
			}
			setEvents({});
		} finally {
			setLoadingHorarios(false);
		}
	};

	// Função para obter turnos da oferta
	const getTurnosOferta = (phaseNumber) => {
		if (!ofertas || ofertas.length === 0) {
			return ["vespertino"];
		}

		const ofertasFase = ofertas.filter(
			(o) =>
				o.ano === selectedAnoSemestre.ano &&
				o.semestre === selectedAnoSemestre.semestre &&
				o.fase === phaseNumber &&
				o.id_curso === (selectedCurso?.id || 1),
		);

		if (ofertasFase.length === 0) {
			return ["vespertino"];
		}

		const turnos = ofertasFase
			.map((oferta) => {
				if (oferta && oferta.turno) {
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
			.filter(Boolean);

		return [...new Set(turnos)];
	};

	// Verifica se uma fase tem múltiplos turnos
	const hasMultiplosTurnos = (phaseNumber) => {
		const turnos = getTurnosOferta(phaseNumber);
		return turnos.length > 1;
	};

	// Função para obter fases disponíveis
	const getFasesDisponiveis = () => {
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
	};

	// Carregar dados iniciais
	useEffect(() => {
		fetchCursos();
		fetchProfessores();
		fetchDisciplinas();
		fetchAnosSemestres();
	}, []);

	// Carregar horários quando dados estiverem prontos
	useEffect(() => {
		if (
			disciplinas.length > 0 &&
			professores.length > 0 &&
			selectedCurso &&
			selectedAnoSemestre.ano &&
			selectedAnoSemestre.semestre
		) {
			setEvents({});
			loadHorariosFromDatabase();
		}
	}, [disciplinas, professores, selectedCurso, selectedAnoSemestre]);

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

	const isLoading =
		loadingCursos ||
		loadingProfessores ||
		loadingDisciplinas ||
		loadingHorarios ||
		loadingAnosSemestres ||
		loadingOfertas;

	return (
		<Box sx={{ padding: 2 }}>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					mb: 4,
				}}
			>
				<Box>
					<Typography variant="h4">
						Visualização de Horários
					</Typography>
					<Typography variant="caption" color="textSecondary">
						Consulta de horários por curso e período
					</Typography>
				</Box>

				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					<FormControl sx={{ minWidth: 200 }}>
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
						>
							{cursos.map((curso) => (
								<MenuItem key={curso.id} value={curso.id}>
									{curso.nome} ({curso.codigo})
								</MenuItem>
							))}
							{cursos.length === 0 && !loadingCursos && (
								<MenuItem disabled>
									Nenhum curso encontrado
								</MenuItem>
							)}
						</Select>
					</FormControl>

					<FormControl sx={{ minWidth: 200 }}>
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
								!selectedCurso
							}
						>
							{anosSemestres.map((anoSemestre) => (
								<MenuItem
									key={`${anoSemestre.ano}-${anoSemestre.semestre}`}
									value={`${anoSemestre.ano}-${anoSemestre.semestre}`}
								>
									{anoSemestre.ano}/{anoSemestre.semestre}º
									Semestre
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Box>
			</Box>

			{/* Alerts de erro */}
			{errorCursos && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{errorCursos}
				</Alert>
			)}

			{loadError && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{loadError}
				</Alert>
			)}

			{!selectedCurso && !loadingCursos && cursos.length > 0 && (
				<Alert severity="info" sx={{ mb: 2 }}>
					Selecione um curso para visualizar os horários disponíveis.
				</Alert>
			)}

			{!loadingCursos && cursos.length === 0 && !errorCursos && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Nenhum curso cadastrado no sistema.
				</Alert>
			)}

			{isLoading ? (
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
								? "Carregando cursos..."
								: loadingProfessores
									? "Carregando professores..."
									: loadingDisciplinas
										? "Carregando disciplinas..."
										: loadingAnosSemestres
											? "Carregando anos/semestres..."
											: loadingOfertas
												? "Carregando ofertas..."
												: "Carregando horários..."}
						</Typography>
					</Box>
				</Box>
			) : (
				<>
					{selectedCurso &&
						Object.keys(events).length === 0 &&
						!loadError && (
							<Alert severity="info" sx={{ mb: 2 }}>
								Nenhum horário cadastrado para{" "}
								{selectedCurso.nome} no período{" "}
								{selectedAnoSemestre.ano}/
								{selectedAnoSemestre.semestre}º semestre.
							</Alert>
						)}

					{selectedCurso &&
						getFasesDisponiveis().length === 0 &&
						Object.keys(events).length === 0 && (
							<Alert severity="warning" sx={{ mb: 2 }}>
								Nenhuma oferta de fase cadastrada para este
								curso no período selecionado.
							</Alert>
						)}

					{selectedCurso &&
						getFasesDisponiveis().map((phaseNumber) => {
							const phaseEvents = events[phaseNumber] || {};
							return (
								<PhaseGridView
									key={phaseNumber}
									phaseNumber={phaseNumber}
									events={phaseEvents}
									professores={professores}
									disciplinas={disciplinas}
									getTurnosOferta={getTurnosOferta}
									hasMultiplosTurnos={hasMultiplosTurnos}
								/>
							);
						})}

					{selectedCurso && Object.keys(events).length > 0 && (
						<Box sx={{ mt: 3, textAlign: "center" }}>
							<Typography
								variant="caption"
								color="textSecondary"
								display="block"
							>
								Exibindo horários de {selectedCurso.nome} -{" "}
								{selectedAnoSemestre.ano}/
								{selectedAnoSemestre.semestre}º semestre
							</Typography>
							<Typography
								variant="caption"
								color="primary"
								fontWeight="bold"
							>
								{getFasesDisponiveis().length} fase(s) •
								{Object.values(events).reduce(
									(total, phaseEvents) =>
										total + Object.keys(phaseEvents).length,
									0,
								)}{" "}
								horário(s) cadastrado(s)
							</Typography>
						</Box>
					)}
				</>
			)}
		</Box>
	);
}
