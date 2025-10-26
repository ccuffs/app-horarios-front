import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Box,
	Typography,
	Alert,
	List,
	ListItem,
	ListItemText,
	Divider,
	Chip,
	Badge,
	Button,
} from "@mui/material";
import {
	Warning as WarningIcon,
	Schedule as ScheduleIcon,
} from "@mui/icons-material";

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

export default ConflitosModal;
