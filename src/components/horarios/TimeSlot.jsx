import React, { useState } from "react";
import { Box, useTheme } from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import Permissoes from "../../enums/permissoes";
import permissoesService from "../../services/permissoesService";
import {
	timeSlotsNoturno,
	isValidStartTimeNoturno,
} from "../../utils/horariosUtils";
import CalendarEvent from "./CalendarEvent";

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

export default TimeSlot;
