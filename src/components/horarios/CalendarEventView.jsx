import React from "react";
import { Typography, Box, Paper, Tooltip, useTheme } from "@mui/material";
import { formatTimeForDisplay } from "../../utils/horariosUtils";

// Função auxiliar para calcular o horário final de um evento
const getEndTime = (startTime, duration, timeSlots) => {
	const startIndex = timeSlots.indexOf(startTime);
	if (startIndex === -1) return startTime;

	const endIndex = startIndex + duration;

	if (endIndex < timeSlots.length) {
		return timeSlots[endIndex];
	}

	const lastSlot = timeSlots[timeSlots.length - 1];
	const [lastHour, lastMinute] = lastSlot.split(":").map(Number);
	const extraSlots = endIndex - timeSlots.length + 1;
	const extraMinutes = extraSlots * 30;

	const totalMinutes = lastHour * 60 + lastMinute + extraMinutes;
	const finalHour = Math.floor(totalMinutes / 60);
	const finalMinute = totalMinutes % 60;

	return `${finalHour.toString().padStart(2, "0")}:${finalMinute
		.toString()
		.padStart(2, "0")}`;
};

// Componente para exibir evento (apenas visualização)
const CalendarEventView = ({
	event,
	timeSlots,
	professores,
	disciplinas,
	isMultiple,
	multipleIndex,
	multipleTotal,
}) => {
	const theme = useTheme();

	// Buscar nomes dos professores
	const getProfessoresInfo = () => {
		if (event.professoresIds && Array.isArray(event.professoresIds)) {
			return event.professoresIds
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
			return professor ? [professor] : [];
		}
		return [];
	};

	// Buscar informações da disciplina
	const getDisciplinaInfo = () => {
		if (event.disciplinaId) {
			return disciplinas.find((d) => d.id === event.disciplinaId);
		}
		return null;
	};

	const professoresInfo = getProfessoresInfo();
	const disciplinaInfo = getDisciplinaInfo();

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
			sx={{
				...calculateMultipleEventStyles(),
				backgroundColor: event.disciplinaId
					? event.color
					: theme.palette.grey[500], // Cinza do tema se não tem disciplina
				color: "white",
				padding: isMultiple ? "2px 4px" : 1, // Padding mais compacto para múltiplos
				cursor: "default", // Cursor padrão para visualização
				height: `${event.duration * 30}px`,
				minHeight: "30px",
				overflow: "hidden",
				zIndex: 1,
				boxShadow: theme.shadows[2],
				transition: "all 0.2s ease",
				border: !event.disciplinaId ? "2px dashed #fff" : "none", // Borda tracejada se incompleto
				opacity: !event.disciplinaId ? 0.7 : 1, // Reduzir opacidade se incompleto
				"&:hover": {
					boxShadow: theme.shadows[4],
				},
			}}
		>
			<Typography
				variant="caption"
				sx={{
					fontWeight: "bold",
					display: "block",
					lineHeight: 1.1,
					marginBottom: isMultiple ? 0.1 : 0.5,
					fontSize: isMultiple ? "0.6rem" : "0.75rem",
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
						.map((professor, index) => (
							<Typography
								key={professor.codigo}
								variant="caption"
								sx={{
									fontSize: isMultiple
										? "0.55rem"
										: "0.65rem",
									opacity: 0.8,
									display: "block",
									lineHeight: isMultiple ? 1.1 : 1.2,
								}}
							>
								{isMultiple
									? professor.nome.length > 10
										? professor.nome.substring(0, 10) +
											"..."
										: professor.nome
									: professor.nome}
							</Typography>
						))}
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
					? `${formatTimeForDisplay(event.startTime)}-${formatTimeForDisplay(
							getEndTime(
								event.startTime,
								event.duration,
								timeSlots,
							),
						)}`
					: `${formatTimeForDisplay(event.startTime)} - ${formatTimeForDisplay(
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
		</Paper>
	);

	// Criar tooltip com informações completas para todos os eventos
	const tooltipContent = (
		<Box>
			<Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
				{event.title || "Horário incompleto"}
			</Typography>

			{/* Mostrar código da disciplina se disponível */}
			{disciplinaInfo && disciplinaInfo.codigo && (
				<Typography variant="caption" display="block" sx={{ mb: 1 }}>
					<strong>Código:</strong> {disciplinaInfo.codigo}
				</Typography>
			)}

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
							• {professor.nome} ({professor.codigo})
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

			{/* Mostrar ementa da disciplina se disponível */}
			{disciplinaInfo &&
				disciplinaInfo.ementa &&
				disciplinaInfo.ementa.trim() !== "" && (
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
							sx={{ fontWeight: "bold", mb: 0.5 }}
						>
							Ementa:
						</Typography>
						<Typography
							variant="caption"
							display="block"
							sx={{
								lineHeight: 1.3,
								maxWidth: "300px",
								overflow: "hidden",
								textOverflow: "ellipsis",
								display: "-webkit-box",
								WebkitLineClamp: 4,
								WebkitBoxOrient: "vertical",
							}}
						>
							{disciplinaInfo.ementa}
						</Typography>
					</Box>
				)}

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

export default CalendarEventView;

