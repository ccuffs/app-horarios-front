import React, { useEffect, useState } from "react";
import {
	Modal,
	Paper,
	Box,
	Typography,
	Stack,
	Autocomplete,
	TextField,
	Chip,
	CircularProgress,
	Alert,
	Button,
	FormControlLabel,
	Checkbox,
	Tooltip,
	IconButton,
} from "@mui/material";
import {
	Close as CloseIcon,
	Warning as WarningIcon,
} from "@mui/icons-material";
import axiosInstance from "../../auth/axios";
import {
	getUniqueDisciplinas,
	timeSlotsMatutino,
	timeSlotsVespertino,
	timeSlotsNoturno,
	formatTimeForDisplay,
	getDisciplinaProfessoresFromOtherPeriod,
	getDisciplinaProfessoresFromSamePhase,
} from "../../utils/horariosUtils";

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

						// Regra 4: Se algum dos eventos permite conflito, não acusar conflito
						if (
							horarioAtual.permitirConflito ||
							outroHorario.permitirConflito
						) {
							return; // Pular se algum evento permitir conflito
						}

						// Regra 3: Se mesmo CCR, mesmo horário/dia mas fases diferentes, não é conflito
						if (horarioAtual.id_ccr === outroHorario.id_ccr && horarioAtual.fase !== outroHorario.fase) {
							return; // Mesmo CCR em fases diferentes não é conflito
						}

						// Regra 1 e 2: Verificar sobreposição temporal
						// Regra 1: CCRs diferentes, mesmo horário/dia, qualquer fase → CONFLITO
						// Regra 2: Mesmo CCR, mesmo horário/dia, mesma fase → CONFLITO
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

export default EventModal;
