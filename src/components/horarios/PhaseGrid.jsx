import React from "react";
import { Box, Chip, Typography, useTheme } from "@mui/material";
import TimeSlot from "./TimeSlot";
import {
	timeSlotsMatutino,
	timeSlotsVespertino,
	timeSlotsNoturno,
	daysOfWeek,
	formatTimeForDisplay,
} from "../../utils/horariosUtils";

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
	canViewConflicts, // Permissão para visualizar conflitos
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
									canViewConflicts={canViewConflicts}
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

export default PhaseGrid;
