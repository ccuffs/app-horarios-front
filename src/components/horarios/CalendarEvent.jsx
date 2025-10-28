import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Paper,
	Box,
	Typography,
	IconButton,
	Tooltip,
} from "@mui/material";
import {
	Delete as DeleteIcon,
	Warning as WarningIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import Permissoes from "../../enums/permissoes";
import permissoesService from "../../services/permissoesService";
import { formatTimeForDisplay, getEndTime } from "../../utils/horariosUtils";

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

export default CalendarEvent;
