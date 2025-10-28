import { useState, useEffect, useCallback } from "react";
import ccrsController from "../controllers/ccrs-controller.js";
import ccrsService from "../services/ccrs-service.js";
import cursosService from "../services/cursos-service.js";

export function useCCRs() {
	const [ccrs, setCCRs] = useState([]);
	const [cursos, setCursos] = useState([]);
	const [formData, setFormData] = useState({
		id: "",
		codigo: "",
		nome: "",
		creditos: "",
		ementa: "",
	});
	const [cursosSelecionados, setCursosSelecionados] = useState([]);
	const [edit, setEdit] = useState(false);
	const [openMessage, setOpenMessage] = useState(false);
	const [openDialog, setOpenDialog] = useState(false);
	const [messageText, setMessageText] = useState("");
	const [messageSeverity, setMessageSeverity] = useState("success");
	const [idDelete, setIdDelete] = useState(-1);

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		try {
			const [ccrsData, cursosData] = await Promise.all([
				ccrsService.getCCRs(),
				cursosService.getCursos(),
			]);
			setCCRs(ccrsData);
			setCursos(cursosData);
		} catch (error) {
			setCCRs([]);
			setCursos([]);
		}
	}

	async function getData() {
		try {
			const ccrsData = await ccrsService.getCCRs();
			setCCRs(ccrsData);
		} catch (error) {
			console.log("Não foi possível retornar a lista de CCRs: ", error);
			setCCRs([]);
		}
	}

	const handleEdit = useCallback((data) => {
		const editData = ccrsController.prepareEditData(data);
		const cursosIds = ccrsController.prepareCursosSelecionados(data);
		setFormData(editData);
		setCursosSelecionados(cursosIds);
		setEdit(true);
	}, []);

	const handleDelete = useCallback((row) => {
		setIdDelete(row.id);
		setOpenDialog(true);
	}, []);

	const handleInputChange = useCallback((e) => {
		setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	}, []);

	const handleCursosChange = useCallback((event) => {
		const {
			target: { value },
		} = event;
		setCursosSelecionados(
			typeof value === "string" ? value.split(",") : value,
		);
	}, []);

	const handleAddOrUpdate = useCallback(async () => {
		const validation = ccrsController.validateFormData(formData, edit);

		if (!validation.isValid) {
			setMessageText(validation.message);
			setMessageSeverity("error");
			setOpenMessage(true);
			return;
		}

		const result = await ccrsController.saveOrUpdateCCR(
			formData,
			cursosSelecionados,
			edit,
		);

		if (result.success) {
			setMessageText(result.message);
			setMessageSeverity("success");
			setFormData(ccrsController.getResetFormData());
			setCursosSelecionados(
				ccrsController.getResetCursosSelecionados(),
			);
			setEdit(false);
		} else {
			setMessageText(result.message);
			setMessageSeverity("error");
		}

		setOpenMessage(true);
		await getData();
	}, [formData, cursosSelecionados, edit]);

	const handleCancelClick = useCallback(() => {
		setEdit(false);
		setFormData(ccrsController.getResetFormData());
		setCursosSelecionados(ccrsController.getResetCursosSelecionados());
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
		const result = await ccrsController.removeCCR(idDelete);

		if (result.success) {
			setMessageText(result.message);
			setMessageSeverity("success");
		} else {
			setMessageText(result.message);
			setMessageSeverity("error");
		}

		setFormData(ccrsController.getResetFormData());
		setOpenDialog(false);
		setOpenMessage(true);
		await getData();
	}, [idDelete]);

	const handleNoDeleteClick = useCallback(() => {
		setOpenDialog(false);
	}, []);

	return {
		ccrs,
		cursos,
		formData,
		cursosSelecionados,
		edit,
		openMessage,
		openDialog,
		messageText,
		messageSeverity,
		idDelete,
		handleEdit,
		handleDelete,
		handleInputChange,
		handleCursosChange,
		handleAddOrUpdate,
		handleCancelClick,
		handleCloseMessage,
		handleClose,
		handleDeleteClick,
		handleNoDeleteClick,
	};
}

