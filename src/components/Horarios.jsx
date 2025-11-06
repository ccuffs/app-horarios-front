import React from "react";
import {
	Typography,
	Box,
	Button,
	FormControl,
	InputLabel,
	IconButton,
	CircularProgress,
	Alert,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Divider,
	Badge,
	Snackbar,
	Drawer,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Select,
	MenuItem,
} from "@mui/material";
import {
	Close as CloseIcon,
	Save as SaveIcon,
	Delete as DeleteIcon,
	Warning as WarningIcon,
	Download as DownloadIcon,
	TableChart as TableChartIcon,
} from "@mui/icons-material";
import EventModal from "./horarios/EventModal";
import ImportModal from "./horarios/ImportModal";
import ConflitosModal from "./horarios/ConflitosModal";
import PhaseGrid from "./horarios/PhaseGrid";
import anoSemestreController from "../controllers/ano-semestre-controller";
import { daysOfWeek, dayToNumber } from "../utils/horariosUtils.js";
import useHorarios from "../hooks/useHorarios";
import { usePermissions } from "../hooks/usePermissions";
import Permissoes from "../enums/permissoes";

export default function Horarios() {
	const {
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
		modalOpen,
		selectedEvent,
		selectedPhase,
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
		loadingOfertas,
		errorOfertas,
		snackbarMessage,
		snackbarOpen,
		setSnackbarOpen,
		showReloadConfirmation,
		setShowReloadConfirmation,
		showImportModal,
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
		showSumarioModal,
		setShowSumarioModal,
		sumarioAlteracoes,

		isEvenSemester,

		// Funções
		getCurrentUserId,
		fetchCursos,
		fetchProfessores,
		fetchDisciplinas,
		fetchOfertas,
		fetchAnosSemestres,
		verificarSeEventoTemConflito,
		obterConflitosDoEvento,
		saveAllHorariosToDatabase,
		executeSyncToDatabase,
		getValidHorariosCount,
		getChangesCount,
		hasPendingChanges,
		handleReloadClick,
		handleSyncAndReload,
		reloadAllData,
		loadHorariosFromDatabase,
		importarHorarios,
		handleCloseImportModal,
		hasMultiplosTurnos,
		hasTurnoEspecifico,
		isPhaseVespertino,
		isPhaseMatutino,
		getFasesDisponiveis,
		getTurnosOferta,
		handleDropEvent,
		handleResizeEvent,
		handleAddEvent,
		handleEditEvent,
		handleDeleteEvent,
		handleSaveEvent,
		handleModalClose,
		generateScheduleJSON,
		horariosSeOverlapam,
	} = useHorarios();

	// Verificar se o usuário pode visualizar conflitos (ADMIN ou COORDENADOR)
	const { hasPermission } = usePermissions();
	const canViewConflicts = hasPermission([
		Permissoes.GRUPO.ADMIN,
		Permissoes.GRUPO.COORDENADOR,
	]);

	return (
		<Box sx={{ padding: 2 }}>
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "flex-start",
					alignItems: "stretch",
					gap: 2,
					mb: 4,
				}}
			>
				{/* Seção do título - sempre no topo em mobile */}
				<Box
					sx={{
						textAlign: { xs: "center", lg: "left" },
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

				{/* Seção dos controles - responsiva na linha abaixo */}
				<Box
					sx={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "wrap",
						alignItems: "center",
						gap: 2,
						width: "100%",
					}}
				>
					{/* Grupo de botões */}
					<Box
						sx={{
							display: "flex",
							flexDirection: { xs: "column", sm: "row" },
							alignItems: "center",
							gap: 2,
							width: "100%",
							flex: "1 1 320px",
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

					{canViewConflicts && (
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
					)}

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

					{/* Grupo de filtros/seletores */}
					<Box
						sx={{
							display: "flex",
							flexDirection: { xs: "column", sm: "row" },
							alignItems: "center",
							gap: 2,
							width: "100%",
							flex: "2 1 480px",
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
											if (!canManageHorarios) return;
											const novoStatus = e.target.value;
											const publicado =
												novoStatus === "publicado";

											try {
												const result =
													await anoSemestreController.updatePublicacaoStatus(
														selectedAnoSemestre.ano,
														selectedAnoSemestre.semestre,
														publicado,
													);

												if (result.success) {
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
														() =>
															setSaveSuccess(
																false,
															),
														4000,
													);
												} else {
													setSaveError(
														result.message,
													);
													setTimeout(
														() =>
															setSaveError(null),
														6000,
													);
												}
											} catch (error) {
												console.error(
													"Erro ao alterar status de publicação:",
													error,
												);
												setSaveError(
													error.message ||
														"Erro ao alterar status de publicação",
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
								const formatarData =
									anoSemestreController.formatarData;

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
									canViewConflicts={canViewConflicts}
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
				anosSemestres={anosSemestres}
				selectedAnoSemestre={selectedAnoSemestre}
				selectedCurso={selectedCurso}
				horariosSeOverlapam={horariosSeOverlapam}
				dayToNumber={dayToNumber}
				daysOfWeek={daysOfWeek}
				canViewConflicts={canViewConflicts}
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
						reloadAllData();
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

			{/* Modal de Sumário de Alterações */}
			<Dialog
				open={showSumarioModal}
				onClose={() => setShowSumarioModal(false)}
				maxWidth="md"
				fullWidth
				scroll="paper"
			>
				<DialogTitle>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<SaveIcon color="primary" />
						Sumário de Alterações
					</Box>
				</DialogTitle>
				<DialogContent dividers>
					{sumarioAlteracoes && (
						<>
							<Typography variant="body1" sx={{ mb: 2 }}>
								Você está prestes a sincronizar{" "}
								<strong>
									{sumarioAlteracoes.totais.total}{" "}
									alteração(ões)
								</strong>{" "}
								com o banco de dados:
							</Typography>

							{sumarioAlteracoes.totais.inclusoes > 0 && (
								<Box sx={{ mb: 3 }}>
									<Typography
										variant="h6"
										sx={{
											mb: 1,
											color: "success.main",
											fontWeight: "medium",
										}}
									>
										✓ Inclusões (
										{sumarioAlteracoes.totais.inclusoes})
									</Typography>
									<TableContainer
										component={Paper}
										variant="outlined"
									>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Docente
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														CCR
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Dia
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Horário
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{sumarioAlteracoes.alteracoes.inclusoes.map(
													(inc, idx) => (
														<TableRow
															key={idx}
															hover
														>
															<TableCell>
																{inc.docente}
															</TableCell>
															<TableCell>
																{inc.ccr}
															</TableCell>
															<TableCell>
																{inc.diaSemana}
															</TableCell>
															<TableCell>
																{inc.horaInicio}{" "}
																- {inc.horaFim}
															</TableCell>
														</TableRow>
													),
												)}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							{sumarioAlteracoes.totais.atualizacoes > 0 && (
								<Box sx={{ mb: 3 }}>
									<Typography
										variant="h6"
										sx={{
											mb: 1,
											color: "warning.main",
											fontWeight: "medium",
										}}
									>
										⟳ Atualizações (
										{sumarioAlteracoes.totais.atualizacoes})
									</Typography>
									<TableContainer
										component={Paper}
										variant="outlined"
									>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														CCR
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Dia
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Horário
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Docente Anterior
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Docente Novo
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{sumarioAlteracoes.alteracoes.atualizacoes.map(
													(atu, idx) => (
														<TableRow
															key={idx}
															hover
														>
															<TableCell>
																{atu.ccr}
															</TableCell>
															<TableCell>
																{atu.diaSemana}
															</TableCell>
															<TableCell>
																{atu.horaInicio}{" "}
																- {atu.horaFim}
															</TableCell>
															<TableCell
																sx={{
																	textDecoration:
																		"line-through",
																	color: "text.secondary",
																}}
															>
																{
																	atu.docenteAntigo
																}
															</TableCell>
															<TableCell
																sx={{
																	color: "success.main",
																}}
															>
																{
																	atu.docenteNovo
																}
															</TableCell>
														</TableRow>
													),
												)}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							{sumarioAlteracoes.totais.remocoes > 0 && (
								<Box sx={{ mb: 2 }}>
									<Typography
										variant="h6"
										sx={{
											mb: 1,
											color: "error.main",
											fontWeight: "medium",
										}}
									>
										✗ Remoções (
										{sumarioAlteracoes.totais.remocoes})
									</Typography>
									<TableContainer
										component={Paper}
										variant="outlined"
									>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Docente
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														CCR
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Dia
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Horário
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{sumarioAlteracoes.alteracoes.remocoes.map(
													(rem, idx) => (
														<TableRow
															key={idx}
															hover
														>
															<TableCell>
																{rem.docente}
															</TableCell>
															<TableCell>
																{rem.ccr}
															</TableCell>
															<TableCell>
																{rem.diaSemana}
															</TableCell>
															<TableCell>
																{rem.horaInicio}{" "}
																- {rem.horaFim}
															</TableCell>
														</TableRow>
													),
												)}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							{sumarioAlteracoes.totais.modificacoes > 0 && (
								<Box sx={{ mb: 2 }}>
									<Typography
										variant="h6"
										sx={{
											mb: 1,
											color: "info.main",
											fontWeight: "medium",
										}}
									>
										✎ Modificações (
										{sumarioAlteracoes.totais.modificacoes})
									</Typography>
									<TableContainer
										component={Paper}
										variant="outlined"
									>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Docente
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														CCR
													</TableCell>
													<TableCell
														sx={{
															fontWeight: "bold",
														}}
													>
														Alteração
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{sumarioAlteracoes.alteracoes.modificacoes.map(
													(mod, idx) => (
														<TableRow
															key={idx}
															hover
														>
															<TableCell>
																{mod.docente}
															</TableCell>
															<TableCell>
																{mod.ccr}
															</TableCell>
															<TableCell>
																{mod.mudouDia && (
																	<Box
																		sx={{
																			mb: 0.5,
																		}}
																	>
																		<Typography
																			variant="caption"
																			display="block"
																		>
																			<strong>
																				Dia:
																			</strong>{" "}
																			<span
																				style={{
																					textDecoration:
																						"line-through",
																					color: "text.secondary",
																				}}
																			>
																				{
																					mod.diaSemanaAntigo
																				}
																			</span>
																			{
																				" → "
																			}
																			<span
																				style={{
																					color: "green",
																				}}
																			>
																				{
																					mod.diaSemana
																				}
																			</span>
																		</Typography>
																	</Box>
																)}
																{mod.mudouHorario && (
																	<Box
																		sx={{
																			mb: 0.5,
																		}}
																	>
																		<Typography
																			variant="caption"
																			display="block"
																		>
																			<strong>
																				Horário:
																			</strong>{" "}
																			<span
																				style={{
																					textDecoration:
																						"line-through",
																					color: "text.secondary",
																				}}
																			>
																				{
																					mod.horaInicioAntigo
																				}
																			</span>
																			{
																				" → "
																			}
																			<span
																				style={{
																					color: "green",
																				}}
																			>
																				{
																					mod.horaInicio
																				}
																			</span>
																		</Typography>
																	</Box>
																)}
																{mod.mudouDuracao && (
																	<Box>
																		<Typography
																			variant="caption"
																			display="block"
																		>
																			<strong>
																				Duração:
																			</strong>{" "}
																			<span
																				style={{
																					textDecoration:
																						"line-through",
																					color: "text.secondary",
																				}}
																			>
																				{
																					mod.horaInicioAntigo
																				}{" "}
																				-{" "}
																				{
																					mod.horaFimAntigo
																				}
																			</span>
																			{
																				" → "
																			}
																			<span
																				style={{
																					color: "green",
																				}}
																			>
																				{
																					mod.horaInicio
																				}{" "}
																				-{" "}
																				{
																					mod.horaFim
																				}
																			</span>
																		</Typography>
																	</Box>
																)}
															</TableCell>
														</TableRow>
													),
												)}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}
						</>
					)}
				</DialogContent>
				<DialogActions sx={{ p: 2, gap: 1 }}>
					<Button
						onClick={() => setShowSumarioModal(false)}
						variant="outlined"
						disabled={savingHorarios}
					>
						Cancelar
					</Button>
					<Button
						onClick={executeSyncToDatabase}
						variant="contained"
						color="primary"
						startIcon={
							savingHorarios ? (
								<CircularProgress size={20} />
							) : (
								<SaveIcon />
							)
						}
						disabled={savingHorarios}
					>
						{savingHorarios
							? "Sincronizando..."
							: "Confirmar e Sincronizar"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
