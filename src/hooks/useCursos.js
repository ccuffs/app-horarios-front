import { useState, useEffect, useCallback } from "react";
import cursosController from "../controllers/cursos-controller.js";
import cursosService from "../services/cursos-service.js";

export function useCursos() {
	const [cursos, setCursos] = useState([]);
	const [formData, setFormData] = useState({
		id: "",
		codigo: "",
		nome: "",
		turno: "",
	});
	const [edit, setEdit] = useState(false);
	const [openMessage, setOpenMessage] = useState(false);
	const [openDialog, setOpenDialog] = useState(false);
	const [messageText, setMessageText] = useState("");
	const [messageSeverity, setMessageSeverity] = useState("success");
	const [idDelete, setIdDelete] = useState(-1);
	const [selectTurno, setSelectTurno] = useState("");

	useEffect(() => {
		getData();
	}, []);

	async function getData() {
		try {
			const cursosData = await cursosService.getCursos();
			setCursos(cursosData);
		} catch (error) {
			console.log("Não foi possível retornar a lista de cursos: ", error);
			setCursos([]);
		}
	}

	const handleEdit = useCallback((data) => {
		const editData = cursosController.prepareEditData(data);
		const turno = cursosController.getTurnoFromData(data);
		setFormData(editData);
		setSelectTurno(turno);
		setEdit(true);
	}, []);

	const handleDelete = useCallback((row) => {
		setIdDelete(row.id);
		setOpenDialog(true);
	}, []);

	const handleInputChange = useCallback((e) => {
		setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	}, []);

	const handleSelectChange = useCallback((e) => {
		setSelectTurno(e.target.value);
		setFormData((prev) => ({ ...prev, turno: e.target.value }));
	}, []);

	const handleAddOrUpdate = useCallback(async () => {
		const validation = cursosController.validateFormData(formData, edit);

		if (!validation.isValid) {
			setMessageText(validation.message);
			setMessageSeverity("error");
			setOpenMessage(true);
			return;
		}

		const result = await cursosController.saveOrUpdateCurso(formData, edit);

		if (result.success) {
			setMessageText(result.message);
			setMessageSeverity("success");
			setFormData(cursosController.getResetFormData());
			setSelectTurno(cursosController.getResetTurno());
			setEdit(false);
		} else {
			setMessageText(result.message);
			setMessageSeverity("error");
		}

		setOpenMessage(true);
		await getData();
	}, [formData, edit]);

	const handleCancelClick = useCallback(() => {
		setEdit(false);
		setFormData(cursosController.getResetFormData());
		setSelectTurno(cursosController.getResetTurno());
	}, []);

	const handleCloseMessage = useCallback((_, reason) => {
		if (reason === "clickaway") {
			return;
		}
		setOpenMessage(false);
	}, []);

	const handleClose = useCallback(() => {
		setOpenDialog(false);
	}, []);

	const handleDeleteClick = useCallback(async () => {
		const result = await cursosController.removeCurso(idDelete);

		if (result.success) {
			setMessageText(result.message);
			setMessageSeverity("success");
		} else {
			setMessageText(result.message);
			setMessageSeverity("error");
		}

		setFormData(cursosController.getResetFormData());
		setSelectTurno(cursosController.getResetTurno());
		setOpenDialog(false);
		setOpenMessage(true);
		await getData();
	}, [idDelete]);

	const handleNoDeleteClick = useCallback(() => {
		setOpenDialog(false);
	}, []);

	return {
		cursos,
		formData,
		edit,
		openMessage,
		openDialog,
		messageText,
		messageSeverity,
		idDelete,
		selectTurno,
		handleEdit,
		handleDelete,
		handleInputChange,
		handleSelectChange,
		handleAddOrUpdate,
		handleCancelClick,
		handleCloseMessage,
		handleClose,
		handleDeleteClick,
		handleNoDeleteClick,
	};
}
