import { useState, useEffect, useCallback } from "react";
import ofertasController from "../controllers/ofertas-controller.js";
import ofertasService from "../services/ofertas-service.js";
import cursosService from "../services/cursos-service.js";

export function useOfertas() {
	const [ofertas, setOfertas] = useState([]);
	const [cursos, setCursos] = useState([]);
	const [formData, setFormData] = useState({
		ano: "",
		semestre: "",
		id_curso: "",
		fase: "",
		turno: "",
	});
	const [edit, setEdit] = useState(false);
	const [oldTurno, setOldTurno] = useState("");
	const [openMessage, setOpenMessage] = useState(false);
	const [openDialog, setOpenDialog] = useState(false);
	const [messageText, setMessageText] = useState("");
	const [messageSeverity, setMessageSeverity] = useState("success");
	const [deleteData, setDeleteData] = useState(null);

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		try {
			const [ofertasData, cursosData] = await Promise.all([
				ofertasService.getOfertas(),
				cursosService.getCursos(),
			]);
			setOfertas(ofertasData);
			setCursos(cursosData);
		} catch (error) {
			setOfertas([]);
			setCursos([]);
		}
	}

	async function getData() {
		try {
			const ofertasData = await ofertasService.getOfertas();
			setOfertas(ofertasData);
		} catch (_) {
			setOfertas([]);
		}
	}

	const handleEdit = useCallback((data) => {
		const editData = ofertasController.prepareEditData(data);
		setFormData(editData);
		setOldTurno(data.turno || "");
		setEdit(true);
	}, []);

	const handleDelete = useCallback((row) => {
		const prepared = ofertasController.prepareDeleteData(row);
		setDeleteData(prepared);
		setOpenDialog(true);
	}, []);

	const handleInputChange = useCallback((e) => {
		setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	}, []);

	const handleAddOrUpdate = useCallback(async () => {
		const validation = ofertasController.validateFormData(formData);

		if (!validation.isValid) {
			setMessageText(validation.message);
			setMessageSeverity("error");
			setOpenMessage(true);
			return;
		}

		const dataToSend = ofertasController.prepareDataForApi(formData);
		const result = await ofertasController.saveOrUpdateOferta(
			formData,
			edit,
			dataToSend,
			oldTurno,
		);

		if (result.success) {
			setMessageText(result.message);
			setMessageSeverity("success");
			setFormData(ofertasController.getResetFormData());
			setEdit(false);
			setOldTurno("");
		} else {
			setMessageText(result.message);
			setMessageSeverity("error");
		}

		setOpenMessage(true);
		await getData();
	}, [formData, edit, oldTurno]);

	const handleCancelClick = useCallback(() => {
		setEdit(false);
		setFormData(ofertasController.getResetFormData());
		setOldTurno("");
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
		const result = await ofertasController.removeOferta(deleteData);

		if (result.success) {
			setMessageText(result.message);
			setMessageSeverity("success");
		} else {
			setMessageText(result.message);
			setMessageSeverity("error");
		}

		setFormData(ofertasController.getResetFormData());
		setOpenDialog(false);
		setOpenMessage(true);
		await getData();
	}, [deleteData]);

	const handleNoDeleteClick = useCallback(() => {
		setOpenDialog(false);
	}, []);

	return {
		ofertas,
		cursos,
		formData,
		edit,
		oldTurno,
		openMessage,
		openDialog,
		messageText,
		messageSeverity,
		handleEdit,
		handleDelete,
		handleInputChange,
		handleAddOrUpdate,
		handleCancelClick,
		handleCloseMessage,
		handleClose,
		handleDeleteClick,
		handleNoDeleteClick,
	};
}
