import React from "react";
import { Box, useTheme } from "@mui/material";
import CalendarEventView from "./CalendarEventView";

// Componente para slot de tempo (apenas visualização)
const TimeSlotView = ({
	time,
	dayId,
	events,
	timeSlots,
	professores,
	disciplinas,
	sx,
}) => {
	const theme = useTheme();
	const eventKey = `${dayId}-${time}`;
	const eventData = events[eventKey];
	const eventsArray = eventData
		? Array.isArray(eventData)
			? eventData
			: [eventData]
		: [];

	return (
		<Box
			sx={{
				height: "30px",
				border: `1px solid ${theme.palette.divider}`,
				position: "relative",
				backgroundColor: "transparent",
				"&:hover": {
					backgroundColor:
						theme.palette.mode === "dark"
							? "rgba(255, 255, 255, 0.12)"
							: "#f5f5f5",
				},
				transition: "background-color 0.2s ease",
				display: "flex",
				gap: eventsArray.length > 1 ? "1px" : "0",
				cursor: "default",
				...(sx || {}),
			}}
		>
			{eventsArray.map((event, index) => (
				<CalendarEventView
					key={event.id}
					event={event}
					timeSlots={timeSlots}
					professores={professores}
					disciplinas={disciplinas}
					isMultiple={eventsArray.length > 1}
					multipleIndex={index}
					multipleTotal={eventsArray.length}
				/>
			))}
		</Box>
	);
};

export default TimeSlotView;
