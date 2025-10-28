import { useState, useEffect, useCallback } from "react";
import docentesController from "../controllers/docentes-controller.js";
import docentesService from "../services/docentes-service.js";

export function useDocentes() {
	const [docentes, setDocentes] = useState([]);
	const [formData, setFormData] = useState({
		codigo: "",
		nome: "",
		email: "",
		sala: "",
	});
	const [edit, setEdit] = useState(false);
	const [openMessage, setOpenMessage] = useState(false);
	const [openDialog, setOpenDialog] = useState(false);
	const [messageText, setMessageText] = useState("");
	const [messageSeverity, setMessageSeverity] = useState("success");
	const [idDelete, setIdDelete] = useState("");

	useEffect(() => {
		getData();
	}, []);

	async function getData() {
		try {
			const docentesData = await docentesService.getDocentes();
			setDocentes(docentesData);
		} catch (error) {
			console.log("Não foi possível retornar a lista de docentes: ", error);
			setDocentes([]);
		}
	}

	const handleEdit = useCallback((data) => {
		const editData = docentesController.prepareEditData(data);
		setFormData(editData);
		setEdit(true);
	}, []);

	const handleDelete = useCallback((row) => {
		setIdDelete(row.codigo);
		setOpenDialog(true);
	}, []);

	const handleInputChange = useCallback((e) => {
		setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	}, []);

	const handleAddOrUpdate = useCallback(async () => {
		const validation = docentesController.validateFormData(formData, edit);

		if (!validation.isValid) {
			setMessageText(validation.message);
			setMessageSeverity("error");
			setOpenMessage(true);
			return;
		}

		const result = await docentesController.saveOrUpdateDocente(
			formData,
			edit,
		);

		if (result.success) {
			setMessageText(result.message);
			setMessageSeverity("success");
			setFormData(docentesController.getResetFormData());
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
		setFormData(docentesController.getResetFormData());
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
		const result = await docentesController.removeDocente(idDelete);

		if (result.success) {
			setMessageText(result.message);
			setMessageSeverity("success");
		} else {
			setMessageText(result.message);
			setMessageSeverity("error");
		}

		setFormData(docentesController.getResetFormData());
		setOpenDialog(false);
		setOpenMessage(true);
		await getData();
	}, [idDelete]);

	const handleNoDeleteClick = useCallback(() => {
		setOpenDialog(false);
	}, []);

	return {
		docentes,
		formData,
		edit,
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


