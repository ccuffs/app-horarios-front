import { customColors } from "../CustomThemeProvider";

export const timeSlotsMatutino = [
	"07:30:00",
	"08:00:00",
	"08:30:00",
	"09:00:00",
	"09:30:00",
	"10:00:00",
	"10:30:00",
	"11:00:00",
	"11:30:00",
	"12:00:00",
];

export const timeSlotsVespertino = [
	"13:30:00",
	"14:00:00",
	"14:30:00",
	"15:00:00",
	"15:30:00",
	"16:00:00",
	"16:30:00",
	"17:00:00",
	"17:30:00",
	"18:00:00",
];

export const timeSlotsNoturno = [
	"19:00:00",
	"19:30:00",
	"20:00:00",
	"20:30:00",
	"21:00:00",
	"21:30:00",
	"22:00:00",
	"22:30:00",
];

export const firstMatutinoSlots = [
	"07:30:00",
	"08:00:00",
	"08:30:00",
	"09:00:00",
	"09:30:00",
];
export const secondMatutinoSlots = [
	"10:00:00",
	"10:30:00",
	"11:00:00",
	"11:30:00",
];
export const firstVespertinoSlots = [
	"13:30:00",
	"14:00:00",
	"14:30:00",
	"15:00:00",
	"15:30:00",
];
export const secondVespertinoSlots = [
	"16:00:00",
	"16:30:00",
	"17:00:00",
	"17:30:00",
];
export const firstNoturnoSlots = [
	"19:00:00",
	"19:30:00",
	"20:00:00",
	"20:30:00",
];
export const secondNoturnoSlots = [
	"21:00:00",
	"21:30:00",
	"22:00:00",
	"22:30:00",
];

export const allNoturnoSlots = [
	...firstNoturnoSlots,
	...secondNoturnoSlots,
];
export const allMatutinoVespertinoSlots = [
	...firstMatutinoSlots,
	...secondMatutinoSlots,
	...firstVespertinoSlots,
	...secondVespertinoSlots,
];

export const getTurnoFromTime = (time) => {
	if (!time || typeof time !== "string") return "desconhecido";
	const t = time.length === 5 ? `${time}:00` : time;
	if (timeSlotsMatutino.includes(t)) return "matutino";
	if (timeSlotsVespertino.includes(t)) return "vespertino";
	if (timeSlotsNoturno.includes(t)) return "noturno";
	return "desconhecido";
};

export const isHorarioNoturno = (startTime) => {
	return allNoturnoSlots.includes(startTime);
};

export const isHorarioMatutinoOuVespertino = (startTime) => {
	return allMatutinoVespertinoSlots.includes(startTime);
};

export const countEventosPorTurno = (disciplinaId, phaseNumber, events) => {
	if (!disciplinaId || !events[phaseNumber])
		return { matutino: 0, vespertino: 0, noturno: 0 };

	const contadores = { matutino: 0, vespertino: 0, noturno: 0 };

	for (const [, eventArray] of Object.entries(events[phaseNumber])) {
		const eventsInSlot = Array.isArray(eventArray)
			? eventArray
			: [eventArray];
		for (const event of eventsInSlot) {
			if (event.disciplinaId === disciplinaId) {
				if (
					[...firstMatutinoSlots, ...secondMatutinoSlots].includes(
						event.startTime,
					)
				) {
					contadores.matutino++;
				} else if (
					[
						...firstVespertinoSlots,
						...secondVespertinoSlots,
					].includes(event.startTime)
				) {
					contadores.vespertino++;
				} else if (allNoturnoSlots.includes(event.startTime)) {
					contadores.noturno++;
				}
			}
		}
	}

	return contadores;
};

export const hasThirdEventNoturnoSeparado = (
	disciplinaId,
	phaseNumber,
	events,
) => {
	const contadores = countEventosPorTurno(disciplinaId, phaseNumber, events);

	const hasMatutinoOuVespertino =
		contadores.matutino > 0 || contadores.vespertino > 0;
	const hasNoturno = contadores.noturno > 0;

	return hasMatutinoOuVespertino && hasNoturno;
};

export const formatTimeForDisplay = (timeString) => {
	if (!timeString || typeof timeString !== "string") return "";

	if (timeString.includes(":")) {
		const parts = timeString.split(":");
		if (parts.length >= 2) {
			return `${parts[0]}:${parts[1]}`;
		}
	}

	return timeString;
};

export const formatTimeForStorage = (timeString) => {
	if (!timeString || typeof timeString !== "string") return "";

	if (timeString.split(":").length === 3) {
		return timeString;
	}

	if (timeString.split(":").length === 2) {
		return `${timeString}:00`;
	}

	return timeString;
};

export const normalizeTimeFromDB = (timeFromDB) => {
	if (!timeFromDB) return "";

	let timeString = timeFromDB;

	if (typeof timeFromDB === "object" && timeFromDB !== null) {
		timeString = timeFromDB.toString();
	}

	if (typeof timeString === "string") {
		const parts = timeString.split(":");
		if (parts.length === 2) {
			return `${parts[0]}:${parts[1]}:00`;
		} else if (parts.length >= 3) {
			return `${parts[0]}:${parts[1]}:${parts[2]}`;
		}
	}

	return timeString;
};

export const isValidStartTimeNoturno = (time) => {
	return time !== "22:30:00";
};

export const daysOfWeek = [
	{ id: "monday", title: "Segunda" },
	{ id: "tuesday", title: "Terça" },
	{ id: "wednesday", title: "Quarta" },
	{ id: "thursday", title: "Quinta" },
	{ id: "friday", title: "Sexta" },
	{ id: "saturday", title: "Sábado" },
];

export const getUniqueDisciplinas = (disciplinas) => {
	const seen = new Set();
	return disciplinas.filter((disciplina) => {
		const uniqueKey = disciplina.id
			? disciplina.id.toString()
			: `${disciplina.nome}-${disciplina.codigo}`;

		if (seen.has(uniqueKey)) {
			console.warn(
				`Disciplina duplicada encontrada: ${disciplina.nome} (ID: ${disciplina.id})`,
			);
			return false;
		}

		seen.add(uniqueKey);
		return true;
	});
};

export const dayToNumber = {
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
};

export const numberToDay = {
	1: "monday",
	2: "tuesday",
	3: "wednesday",
	4: "thursday",
	5: "friday",
	6: "saturday",
};

export const eventToDbFormat = (
	event,
	phaseNumber,
	selectedAnoSemestre,
	selectedCurso,
) => {
	const ano = selectedAnoSemestre.ano;
	const semestre = selectedAnoSemestre.semestre;

	return {
		id_curso: selectedCurso?.id || 1,
		id_ccr: event.disciplinaId || event.id_ccr,
		codigo_docente: event.professorId || event.codigo_docente,
		dia_semana: dayToNumber[event.dayId] || event.dia_semana,
		ano,
		semestre,
		fase: parseInt(phaseNumber, 10),
		hora_inicio: event.startTime || event.hora_inicio,
		duracao: event.duration || event.duracao,
		comentario: event.comentario || "",
		id: event.id,
		permitirConflito: event.permitirConflito || false,
	};
};

export const dayColors = {
	monday: customColors.teal,
	tuesday: customColors.tiffanyBlue,
	wednesday: customColors.orange,
	thursday: customColors.veronica,
	friday: customColors.glaucous,
	saturday: customColors.jet,
};

export const getColorByDay = (dayId) => {
	return dayColors[dayId] || "#9C27B0";
};

export const dbToEventFormat = (dbEvent, disciplinas) => {
	const disciplina = disciplinas.find((d) => d.id === dbEvent.id_ccr);
	const dayId = numberToDay[dbEvent.dia_semana];
	const startTime = normalizeTimeFromDB(dbEvent.hora_inicio);

	return {
		id: dbEvent.id,
		title: disciplina ? disciplina.nome : "Disciplina não encontrada",
		startTime,
		duration: dbEvent.duracao || 2,
		color: getColorByDay(dayId),
		professorId: dbEvent.codigo_docente,
		disciplinaId: dbEvent.id_ccr,
		dayId,
		id_curso: dbEvent.id_curso,
		id_ccr: dbEvent.id_ccr,
		codigo_docente: dbEvent.codigo_docente,
		dia_semana: dbEvent.dia_semana,
		ano: dbEvent.ano,
		semestre: dbEvent.semestre,
		fase: dbEvent.fase,
		hora_inicio: startTime,
		duracao: dbEvent.duracao || 2,
		comentario: dbEvent.comentario || "",
		permitirConflito: dbEvent.permitirConflito || false,
	};
};

export const initialEvents = {};

export const getDisciplinaProfessoresFromOtherPeriod = (
	disciplinaId,
	phaseNumber,
	events,
) => {
	if (!disciplinaId || !events[phaseNumber]) return [];

	const startSlots = [
		"13:30:00",
		"14:00:00",
		"14:30:00",
		"15:00:00",
		"15:30:00",
	];

	for (const [, eventArray] of Object.entries(events[phaseNumber])) {
		const eventsInSlot = Array.isArray(eventArray)
			? eventArray
			: [eventArray];
		for (const event of eventsInSlot) {
			if (
				event.disciplinaId === disciplinaId &&
				startSlots.includes(event.startTime)
			) {
				if (
					event.professoresIds &&
					Array.isArray(event.professoresIds)
				) {
					return event.professoresIds;
				} else if (event.professorId) {
					return [event.professorId];
				}
			}
		}
	}

	return [];
};

export const getDisciplinaProfessoresFromSamePhase = (
	disciplinaId,
	phaseNumber,
	events,
	currentEventStartTime = null,
) => {
	if (!disciplinaId || !events || !events[phaseNumber]) return [];

	const phaseEvents = events[phaseNumber];

	const hasThirdNoturnoSeparado = hasThirdEventNoturnoSeparado(
		disciplinaId,
		phaseNumber,
		events,
	);

	if (hasThirdNoturnoSeparado && currentEventStartTime) {
		const isCurrentNoturno = isHorarioNoturno(currentEventStartTime);

		for (const [, eventArray] of Object.entries(phaseEvents)) {
			const eventsInSlot = Array.isArray(eventArray)
				? eventArray
				: [eventArray];
			for (const event of eventsInSlot) {
				if (event.disciplinaId === disciplinaId) {
					const isEventNoturno = isHorarioNoturno(event.startTime);

					if (isCurrentNoturno === isEventNoturno) {
						if (
							event.professoresIds &&
							Array.isArray(event.professoresIds) &&
							event.professoresIds.length > 0
						) {
							return event.professoresIds;
						} else if (event.professorId) {
							return [event.professorId];
						}
					}
				}
			}
		}
		return [];
	}

	for (const [, eventArray] of Object.entries(phaseEvents)) {
		const eventsInSlot = Array.isArray(eventArray)
			? eventArray
			: [eventArray];
		for (const event of eventsInSlot) {
			if (event.disciplinaId === disciplinaId) {
				if (
					event.professoresIds &&
					Array.isArray(event.professoresIds) &&
					event.professoresIds.length > 0
				) {
					return event.professoresIds;
				} else if (event.professorId) {
					return [event.professorId];
				}
			}
		}
	}

	return [];
};

export const getDisciplinaProfessorFromOtherPeriod = (
	disciplinaId,
	phaseNumber,
	events,
) => {
	const professoresIds = getDisciplinaProfessoresFromOtherPeriod(
		disciplinaId,
		phaseNumber,
		events,
	);
	return professoresIds.length > 0 ? professoresIds[0] : null;
};

export const getDisciplinaProfessorFromSamePhase = (
	disciplinaId,
	phaseNumber,
	events,
	currentEventStartTime = null,
) => {
	const professoresIds = getDisciplinaProfessoresFromSamePhase(
		disciplinaId,
		phaseNumber,
		events,
		currentEventStartTime,
	);
	return professoresIds.length > 0 ? professoresIds[0] : null;
};

export const getEndTime = (startTime, duration, timeSlots) => {
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
