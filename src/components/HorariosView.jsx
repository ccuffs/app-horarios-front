import React, { useState, useEffect } from "react";
import {
    Typography,
    Box,
    Paper,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Tooltip,
} from "@mui/material";
import axios from "axios";
import { customColors } from "./CustomThemeProvider";

const timeSlotsMatutino = [
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

const timeSlotsVespertino = [
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

const timeSlotsNoturno = [
    "19:00:00",
    "19:30:00",
    "20:00:00",
    "20:30:00",
    "21:00:00",
    "21:30:00",
    "22:00:00",
    "22:30:00",
];

const daysOfWeek = [
    { id: "monday", title: "Segunda" },
    { id: "tuesday", title: "Terça" },
    { id: "wednesday", title: "Quarta" },
    { id: "thursday", title: "Quinta" },
    { id: "friday", title: "Sexta" },
    { id: "saturday", title: "Sábado" },
];

// Sistema de cores por dia da semana
const dayColors = {
    monday: customColors.teal,
    tuesday: customColors.tiffanyBlue,
    wednesday: customColors.orange,
    thursday: customColors.veronica,
    friday: customColors.glaucous,
    saturday: customColors.jet,
};

const getColorByDay = (dayId) => {
    return dayColors[dayId] || "#9C27B0";
};

// Função utilitária para converter HH:MM:SS para HH:MM para exibição
const formatTimeForDisplay = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return '';

    if (timeString.includes(':')) {
        const parts = timeString.split(':');
        if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
        }
    }
    return timeString;
};

// Função utilitária para normalizar horários vindos do banco
const normalizeTimeFromDB = (timeFromDB) => {
    if (!timeFromDB) return '';

    let timeString = timeFromDB;

    if (typeof timeFromDB === 'object' && timeFromDB !== null) {
        timeString = timeFromDB.toString();
    }

    if (typeof timeString === 'string') {
        const parts = timeString.split(':');
        if (parts.length === 2) {
            return `${parts[0]}:${parts[1]}:00`;
        } else if (parts.length >= 3) {
            return `${parts[0]}:${parts[1]}:${parts[2]}`;
        }
    }

    return timeString;
};

// Mapeamento de dias da semana para números
const dayToNumber = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

const numberToDay = {
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
};

// Função para buscar cor de disciplina existente no período 13:30-15:30
const getDisciplinaColorFromMorningPeriod = (disciplinaId, phaseNumber, events) => {
    if (!disciplinaId || !events[phaseNumber]) return null;

    // Buscar a disciplina no período da manhã vespertina (13:30-15:30)
    const morningSlots = ["13:30:00", "14:00:00", "14:30:00", "15:00:00", "15:30:00"];

    for (const [, eventArray] of Object.entries(events[phaseNumber])) {
        // eventArray agora é um array de eventos
        const eventsInSlot = Array.isArray(eventArray)
            ? eventArray
            : [eventArray];
        for (const event of eventsInSlot) {
            if (
                event.disciplinaId === disciplinaId &&
                morningSlots.includes(event.startTime)
            ) {
                return event.color;
            }
        }
    }

    return null;
};

// Função para corrigir cores após carregamento dos dados
const fixEventColorsAfterLoading = (eventsFormatted) => {
    // Para cada fase
    Object.keys(eventsFormatted).forEach(phase => {
        const phaseEvents = eventsFormatted[phase];

        // Para cada slot de eventos
        Object.keys(phaseEvents).forEach(slotKey => {
            const eventsInSlot = Array.isArray(phaseEvents[slotKey])
                ? phaseEvents[slotKey]
                : [phaseEvents[slotKey]];

            // Para cada evento no slot
            eventsInSlot.forEach(event => {
                if (event.startTime && timeSlotsVespertino.includes(event.startTime)) {
                    const timeIndex = timeSlotsVespertino.indexOf(event.startTime);

                    // Se é período da tarde (16:00-18:00)
                    if (timeIndex >= 5) {
                        // Buscar cor da mesma disciplina no período da manhã
                        const morningColor = getDisciplinaColorFromMorningPeriod(
                            event.disciplinaId,
                            phase,
                            eventsFormatted
                        );

                        if (morningColor) {
                            event.color = morningColor;
                        } else {
                            // Se não tem cor da manhã, usar cor padrão do dia
                            event.color = getColorByDay(event.dayId);
                        }
                    } else {
                        // Período da manhã - garantir que usa cor do dia
                        event.color = getColorByDay(event.dayId);
                    }
                } else {
                    // Período noturno - usar cor do dia
                    event.color = getColorByDay(event.dayId);
                }
            });
        });
    });

    return eventsFormatted;
};

// Função para converter evento do formato do banco para formato UI
const dbToEventFormat = (dbEvent, disciplinas, professores) => {
    const disciplina = disciplinas.find((d) => d.id === dbEvent.id_ccr);
    const dayId = numberToDay[dbEvent.dia_semana];

    const startTime = normalizeTimeFromDB(dbEvent.hora_inicio);

    const event = {
        id: dbEvent.id,
        title: disciplina ? disciplina.nome : "Disciplina não encontrada",
        startTime: startTime,
        duration: dbEvent.duracao || 2,
        color: getColorByDay(dayId),
        professorId: dbEvent.codigo_docente, // Compatibilidade com formato antigo
        disciplinaId: dbEvent.id_ccr,
        dayId: dayId,
        comentario: dbEvent.comentario || "",
        fase: dbEvent.fase,
        // Campos do banco
        id_curso: dbEvent.id_curso,
        id_ccr: dbEvent.id_ccr,
        codigo_docente: dbEvent.codigo_docente,
        dia_semana: dbEvent.dia_semana,
        ano: dbEvent.ano,
        semestre: dbEvent.semestre,
        hora_inicio: startTime,
        duracao: dbEvent.duracao || 2,
    };

    return event;
};

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
const CalendarEventView = ({ event, timeSlots, professores, disciplinas, isMultiple, multipleIndex, multipleTotal }) => {
    // Buscar nomes dos professores
    const getProfessoresInfo = () => {
        if (event.professoresIds && Array.isArray(event.professoresIds)) {
            return event.professoresIds
                .map((profId) =>
                    professores.find(
                        (p) => p.codigo === profId || p.id === profId
                    )
                )
                .filter(Boolean);
        } else if (event.professorId) {
            const professor = professores.find(
                (p) =>
                    p.codigo === event.professorId || p.id === event.professorId
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
                backgroundColor: event.disciplinaId ? event.color : "#9e9e9e", // Cinza se não tem disciplina
                color: "white",
                padding: isMultiple ? "2px 4px" : 1, // Padding mais compacto para múltiplos
                cursor: "default", // Cursor padrão para visualização
                height: `${event.duration * 30}px`,
                minHeight: "30px",
                overflow: "hidden",
                zIndex: 1,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "all 0.2s ease",
                border: !event.disciplinaId ? "2px dashed #fff" : "none", // Borda tracejada se incompleto
                opacity: !event.disciplinaId ? 0.7 : 1, // Reduzir opacidade se incompleto
                "&:hover": {
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
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
                        ? (event.title.length > 12 ? event.title.substring(0, 12) + "..." : event.title)
                        : "Incompleto"
                    : event.title || "Horário incompleto"}
            </Typography>

            {professoresInfo.length > 0 && (
                <Box sx={{ marginBottom: isMultiple ? 0.1 : 0.5 }}>
                    {professoresInfo.slice(0, isMultiple ? 2 : professoresInfo.length).map((professor, index) => (
                        <Typography
                            key={professor.codigo}
                            variant="caption"
                            sx={{
                                fontSize: isMultiple ? "0.55rem" : "0.65rem",
                                opacity: 0.8,
                                display: "block",
                                lineHeight: isMultiple ? 1.1 : 1.2,
                            }}
                        >
                            {isMultiple
                                ? (professor.nome.length > 10 ? professor.nome.substring(0, 10) + "..." : professor.nome)
                                : professor.nome
                            }
                        </Typography>
                    ))}
                    {/* Indicador se há mais professores */}
                    {isMultiple && professoresInfo.length > 2 && (
                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: "0.5rem",
                                opacity: 0.7,
                                fontStyle: 'italic',
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
                    marginBottom: isMultiple ? (event.comentario ? 0.05 : 0.1) : 0,
                }}
            >
                {isMultiple
                    ? `${formatTimeForDisplay(event.startTime)}-${formatTimeForDisplay(getEndTime(event.startTime, event.duration, timeSlots))}`
                    : `${formatTimeForDisplay(event.startTime)} - ${formatTimeForDisplay(getEndTime(event.startTime, event.duration, timeSlots))}`
                }
            </Typography>

            {/* Mostrar comentário se existir - SEMPRE mostrar quando há comentário */}
            {event.comentario && event.comentario.trim() !== "" && (
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: isMultiple ? "0.45rem" : "0.6rem",
                        opacity: isMultiple ? 0.9 : 0.8,
                        fontStyle: 'italic',
                        fontWeight: isMultiple ? 'bold' : 'normal',
                        display: "block",
                        lineHeight: isMultiple ? 1.1 : 1.2,
                        mt: isMultiple ? 0.05 : 0.5,
                        backgroundColor: isMultiple ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.15)",
                        padding: isMultiple ? "1px 3px" : "2px 4px",
                        borderRadius: "2px",
                        border: isMultiple ? "1px solid rgba(255,255,255,0.3)" : "none",
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        boxShadow: isMultiple ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                    }}
                >
                    💬 {isMultiple
                        ? (event.comentario.length > 12 ? event.comentario.substring(0, 12) + "..." : event.comentario)
                        : event.comentario
                    }
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
                    <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', mb: 0.5 }}>
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
                <strong>Horário:</strong> {formatTimeForDisplay(event.startTime)} -{" "}
                {formatTimeForDisplay(getEndTime(event.startTime, event.duration, timeSlots))}
            </Typography>

            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                <strong>Duração:</strong> {event.duration * 30} minutos ({event.duration} períodos)
            </Typography>

            {/* Mostrar ementa da disciplina se disponível */}
            {disciplinaInfo && disciplinaInfo.ementa && disciplinaInfo.ementa.trim() !== "" && (
                <Box sx={{ mt: 1, p: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                    <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', mb: 0.5 }}>
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
                <Box sx={{ mt: 1, p: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                        <strong>💬 Observação:</strong> {event.comentario}
                    </Typography>
                </Box>
            )}

            {!event.disciplinaId && (
                <Box sx={{ mt: 1, p: 1, backgroundColor: "rgba(158,158,158,0.2)", borderRadius: 1 }}>
                    <Typography variant="caption" display="block" sx={{ color: "#666", fontStyle: 'italic' }}>
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

// Componente para slot de tempo (apenas visualização)
const TimeSlotView = ({ time, dayId, events, timeSlots, professores, disciplinas, sx }) => {
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
                border: "1px solid #e0e0e0",
                position: "relative",
                backgroundColor: "transparent",
                display: "flex",
                gap: eventsArray.length > 1 ? "1px" : "0",
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

// Componente para grid de uma fase (apenas visualização)
const PhaseGridView = ({ phaseNumber, events, professores, disciplinas, getTurnosOferta, hasMultiplosTurnos }) => {
    const temMultiplosTurnos = hasMultiplosTurnos(phaseNumber);

    let timeSlots;
    if (temMultiplosTurnos) {
        const turnos = getTurnosOferta(phaseNumber);
        timeSlots = [];

        if (turnos.includes('matutino')) {
            timeSlots = [...timeSlots, ...timeSlotsMatutino];
        }
        if (turnos.includes('vespertino')) {
            timeSlots = [...timeSlots, ...timeSlotsVespertino];
        }
        if (turnos.includes('noturno')) {
            timeSlots = [...timeSlots, ...timeSlotsNoturno];
        }
    } else {
        // Para fases com apenas um turno, verificar qual turno é
        const turnos = getTurnosOferta(phaseNumber);
        const turno = turnos[0] || "vespertino";

        if (turno === "matutino") {
            timeSlots = timeSlotsMatutino;
        } else if (turno === "vespertino") {
            timeSlots = timeSlotsVespertino;
        } else {
            timeSlots = timeSlotsNoturno;
        }
    }

    // Rótulos de período para os chips
    let periodLabels = [];
    if (temMultiplosTurnos) {
        const turnos = getTurnosOferta(phaseNumber);
        if (turnos.includes('matutino')) {
            periodLabels.push({ label: "Matutino", color: "success" });
        }
        if (turnos.includes('vespertino')) {
            periodLabels.push({ label: "Vespertino", color: "warning" });
        }
        if (turnos.includes('noturno')) {
            periodLabels.push({ label: "Noturno", color: "primary" });
        }
    } else {
        const turnos = getTurnosOferta(phaseNumber);
        const turno = turnos[0] || "vespertino";

        let periodLabel, colorLabel;
        if (turno === "matutino") {
            periodLabel = "Matutino";
            colorLabel = "success";
        } else if (turno === "vespertino") {
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
                            fontStyle: 'italic',
                            color: 'text.secondary'
                        }}
                    >
                        {(() => {
                            const turnos = getTurnosOferta(phaseNumber);
                            let inicio = '', fim = '';

                            if (turnos.includes('matutino')) {
                                inicio = '07:30';
                            }

                            if (turnos.includes('noturno')) {
                                fim = '22:30';
                            } else if (turnos.includes('vespertino')) {
                                fim = '18:00';
                            } else if (turnos.includes('matutino') && !turnos.includes('vespertino') && !turnos.includes('noturno')) {
                                fim = '12:00';
                            }

                            if (!inicio && turnos.includes('vespertino')) {
                                inicio = '13:30';
                            }
                            if (!inicio && turnos.includes('noturno') && !turnos.includes('vespertino')) {
                                inicio = '19:00';
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
                    border: "1px solid #ddd",
                    borderRadius: 1,
                    overflow: "hidden",
                }}
            >
                {/* Time column */}
                <Box
                    sx={{
                        width: "80px",
                        borderRight: "1px solid #ddd",
                        backgroundColor: "#fafafa",
                    }}
                >
                    <Box
                        sx={{
                            height: "40px",
                            borderBottom: "1px solid #ddd",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#f0f0f0",
                        }}
                    >
                        <Typography variant="caption" fontWeight="bold">
                            Horário
                        </Typography>
                    </Box>
                    {timeSlots.map((time, index) => {
                        // Adicionar separador visual entre turnos
                        const isFirstVespertino = temMultiplosTurnos && time === timeSlotsVespertino[0];
                        const isFirstNoturno = temMultiplosTurnos && time === timeSlotsNoturno[0];

                        return (
                            <Box
                                key={time}
                                sx={{
                                    height: "30px",
                                    borderBottom: "1px solid #e0e0e0",
                                    borderTop: (isFirstVespertino || isFirstNoturno) ? "2px dashed #bbb" : "none",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.75rem",
                                    color: "#666",
                                    backgroundColor: (isFirstVespertino || isFirstNoturno) ? "#f5f5f5" : "transparent",
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
                        sx={{ flex: 1, borderRight: "1px solid #ddd" }}
                    >
                        <Box
                            sx={{
                                height: "40px",
                                borderBottom: "1px solid #ddd",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#f5f5f5",
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight="bold">
                                {day.title}
                            </Typography>
                        </Box>

                        {timeSlots.map((time, index) => {
                            // Adicionar separador visual entre turnos
                            const isFirstVespertino = temMultiplosTurnos && time === timeSlotsVespertino[0];
                            const isFirstNoturno = temMultiplosTurnos && time === timeSlotsNoturno[0];

                            return (
                                <TimeSlotView
                                    key={`${day.id}-${time}`}
                                    time={time}
                                    dayId={day.id}
                                    events={events}
                                    timeSlots={timeSlots}
                                    professores={professores}
                                    disciplinas={disciplinas}
                                    sx={(isFirstVespertino || isFirstNoturno) ? { borderTop: "2px dashed #bbb", backgroundColor: "#f5f5f5" } : {}}
                                />
                            );
                        })}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default function HorariosView() {
    const [selectedAnoSemestre, setSelectedAnoSemestre] = useState({
        ano: new Date().getFullYear(),
        semestre: 1
    });
    const [selectedCurso, setSelectedCurso] = useState(null);
    const [cursos, setCursos] = useState([]);
    const [loadingCursos, setLoadingCursos] = useState(true);
    const [errorCursos, setErrorCursos] = useState(null);
    const [events, setEvents] = useState({});
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
            const response = await axios.get("http://localhost:3010/api/cursos");
            const cursosData = response.data.cursos || [];
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
            const response = await axios.get("http://localhost:3010/api/ano-semestre");
            const anosSemestresData = response.data.anosSemestres || [];
            setAnosSemestres(anosSemestresData);

            if (anosSemestresData.length > 0) {
                const anoSemestreExiste = anosSemestresData.some(as =>
                    as.ano === selectedAnoSemestre.ano && as.semestre === selectedAnoSemestre.semestre
                );

                if (!anoSemestreExiste) {
                    const maisRecente = anosSemestresData[0];
                    setSelectedAnoSemestre({
                        ano: maisRecente.ano,
                        semestre: maisRecente.semestre
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
            const response = await axios.get("http://localhost:3010/api/docentes");
            const professoresFormatados = response.data.docentes.map((prof) => ({
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
            const response = await axios.get("http://localhost:3010/api/ccrs");
            const disciplinas = response.data.ccrs || [];
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
            if (selectedAnoSemestre.ano && selectedAnoSemestre.semestre && selectedCurso?.id) {
                params.ano = selectedAnoSemestre.ano;
                params.semestre = selectedAnoSemestre.semestre;
                params.id_curso = selectedCurso.id;
            } else if (selectedCurso?.id) {
                params.id_curso = selectedCurso.id;
            }

            const response = await axios.get("http://localhost:3010/api/ofertas", { params });
            const ofertasData = response.data.ofertas || [];
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
            const response = await axios.get("http://localhost:3010/api/horarios", {
                params: {
                    ano: selectedAnoSemestre.ano,
                    semestre: selectedAnoSemestre.semestre,
                    id_curso: selectedCurso?.id || 1,
                },
            });

            const horariosFromDb = response.data.horarios || [];

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

                const event = dbToEventFormat(baseHorario, disciplinas, professores);

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
            const eventsFormattedFixed = fixEventColorsAfterLoading(eventsFormatted);

            setEvents(eventsFormattedFixed);
        } catch (error) {
            if (error.response?.status === 404) {
                setLoadError("Nenhum horário encontrado para este curso/período");
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

        const ofertasFase = ofertas.filter(o =>
            o.ano === selectedAnoSemestre.ano &&
            o.semestre === selectedAnoSemestre.semestre &&
            o.fase === phaseNumber &&
            o.id_curso === (selectedCurso?.id || 1)
        );

        if (ofertasFase.length === 0) {
            return ["vespertino"];
        }

        const turnos = ofertasFase.map(oferta => {
            if (oferta && oferta.turno) {
                const turnoValue = oferta.turno.toString().toLowerCase();
                if (turnoValue === 'm' || turnoValue === 'matutino') {
                    return "matutino";
                } else if (turnoValue === 'v' || turnoValue === 'vespertino') {
                    return "vespertino";
                } else if (turnoValue === 'n' || turnoValue === 'noturno') {
                    return "noturno";
                } else {
                    return turnoValue;
                }
            }
            return null;
        }).filter(Boolean);

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

        const ofertasAtuais = ofertas.filter(o =>
            o.ano === selectedAnoSemestre.ano &&
            o.semestre === selectedAnoSemestre.semestre &&
            o.id_curso === (selectedCurso?.id || 1)
        );

        if (ofertasAtuais.length === 0) {
            return [];
        }

        const fases = ofertasAtuais.map(o => o.fase).sort((a, b) => a - b);
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
        if (disciplinas.length > 0 && professores.length > 0 && selectedCurso && selectedAnoSemestre.ano && selectedAnoSemestre.semestre) {
            setEvents({});
            loadHorariosFromDatabase();
        }
    }, [disciplinas, professores, selectedCurso, selectedAnoSemestre]);

    // Recarregar ofertas quando ano/semestre ou curso mudar
    useEffect(() => {
        if (selectedCurso && selectedAnoSemestre.ano && selectedAnoSemestre.semestre) {
            fetchOfertas();
        }
    }, [selectedCurso, selectedAnoSemestre]);

    const isLoading = loadingCursos || loadingProfessores || loadingDisciplinas || loadingHorarios || loadingAnosSemestres || loadingOfertas;

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
                    <Typography variant="h4">Visualização de Horários</Typography>
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
                                const curso = cursos.find(c => c.id === e.target.value);
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
                            value={anosSemestres.length > 0 ? `${selectedAnoSemestre.ano}-${selectedAnoSemestre.semestre}` : ""}
                            onChange={(e) => {
                                const [ano, semestre] = e.target.value.split('-');
                                setSelectedAnoSemestre({
                                    ano: parseInt(ano),
                                    semestre: parseInt(semestre)
                                });
                            }}
                            label="Ano/Semestre"
                            disabled={loadingAnosSemestres || anosSemestres.length === 0 || !selectedCurso}
                        >
                            {anosSemestres.map((anoSemestre) => (
                                <MenuItem
                                    key={`${anoSemestre.ano}-${anoSemestre.semestre}`}
                                    value={`${anoSemestre.ano}-${anoSemestre.semestre}`}
                                >
                                    {anoSemestre.ano}/{anoSemestre.semestre}º Semestre
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
                    {selectedCurso && Object.keys(events).length === 0 && !loadError && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Nenhum horário cadastrado para {selectedCurso.nome} no período {selectedAnoSemestre.ano}/{selectedAnoSemestre.semestre}º semestre.
                        </Alert>
                    )}

                    {selectedCurso && getFasesDisponiveis().length === 0 && Object.keys(events).length === 0 && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Nenhuma oferta de fase cadastrada para este curso no período selecionado.
                        </Alert>
                    )}

                    {selectedCurso && getFasesDisponiveis().map((phaseNumber) => {
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
                            <Typography variant="caption" color="textSecondary" display="block">
                                Exibindo horários de {selectedCurso.nome} - {selectedAnoSemestre.ano}/{selectedAnoSemestre.semestre}º semestre
                            </Typography>
                            <Typography variant="caption" color="primary" fontWeight="bold">
                                {getFasesDisponiveis().length} fase(s) •
                                {Object.values(events).reduce((total, phaseEvents) =>
                                    total + Object.keys(phaseEvents).length, 0)} horário(s) cadastrado(s)
                            </Typography>
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
}