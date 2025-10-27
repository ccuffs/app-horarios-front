import React, { useState, useEffect } from "react";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Snackbar,
	Stack,
	TextField,
} from "@mui/material";
import CustomDataGrid from "./CustomDataGrid.jsx";
import docentesController from "../controllers/docentes-controller.js";
import docentesService from "../services/docentes-service.js";

export default function Docentes() {
	const [docentes, setDocentes] = useState([]);
	const [formData, setFormData] = useState({
		codigo: "",
		nome: "",
		email: "",
		sala: "",
	});
	const [edit, setEdit] = useState(false);
	const [openMessage, setOpenMessage] = React.useState(false);
	const [openDialog, setOpenDialog] = React.useState(false);
	const [messageText, setMessageText] = React.useState("");
	const [messageSeverity, setMessageSeverity] = React.useState("success");
	const [idDelete, setIdDelete] = React.useState("");

	useEffect(() => {
		getData();
	}, []);

	async function getData() {
		try {
			const docentesData = await docentesService.getDocentes();
			setDocentes(docentesData);
		} catch (error) {
			console.log(
				"Não foi possível retornar a lista de docentes: ",
				error,
			);
			setDocentes([]);
		}
	}

	function handleEdit(data) {
		const editData = docentesController.prepareEditData(data);
		setFormData(editData);
		setEdit(true);
	}

	function handleDelete(row) {
		setIdDelete(row.codigo);
		setOpenDialog(true);
	}

	function handleInputChange(e) {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	}

	async function handleAddOrUpdate() {
		const validation = docentesController.validateFormData(
			formData,
			edit,
		);

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
	}

	function handleCancelClick() {
		setEdit(false);
		setFormData(docentesController.getResetFormData());
	}

	function handleCloseMessage(_, reason) {
		if (reason === "clickaway") {
			return;
		}
		setOpenMessage(false);
	}

	function handleClose() {
		setOpenDialog(false);
	}

	async function handleDeleteClick() {
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
	}

	function handleNoDeleteClick() {
		setOpenDialog(false);
	}

	const columns = [
		{ field: "codigo", headerName: "Código", width: 150 },
		{ field: "nome", headerName: "Nome", width: 350 },
		{ field: "email", headerName: "Email", width: 300 },
		{ field: "sala", headerName: "Sala", width: 130 },
		{
			field: "actions",
			headerName: "Ações",
			sortable: false,
			width: 250,
			renderCell: (params) => (
				<>
					<Button
						color="primary"
						onClick={() => handleEdit(params.row)}
					>
						Editar
					</Button>
					<Button
						color="secondary"
						onClick={() => handleDelete(params.row)}
					>
						Deletar
					</Button>
				</>
			),
		},
	];

	return (
		<Box>
			<Stack spacing={2}>
				<Stack spacing={2}>
					<TextField
						name="codigo"
						label="Código"
						type="text"
						fullWidth
						size="small"
						value={formData.codigo || ""}
						onChange={handleInputChange}
						disabled={edit}
					/>
					<TextField
						name="nome"
						label="Nome"
						type="text"
						fullWidth
						size="small"
						value={formData.nome || ""}
						onChange={handleInputChange}
					/>
					<Stack spacing={2} direction="row">
						<TextField
							name="email"
							label="Email"
							type="email"
							fullWidth
							size="small"
							value={formData.email || ""}
							onChange={handleInputChange}
						/>

						<TextField
							name="sala"
							label="Sala"
							type="number"
							size="small"
							value={formData.sala || ""}
							onChange={handleInputChange}
						/>
					</Stack>
					<Stack spacing={2} direction="row">
						<Button
							color="primary"
							variant="contained"
							onClick={handleAddOrUpdate}
						>
							{edit ? "Atualizar" : "Adicionar"}
						</Button>
						<Button
							variant="outlined"
							onClick={handleCancelClick}
							color="error"
						>
							Cancelar
						</Button>
					</Stack>
					<Snackbar
						open={openMessage}
						autoHideDuration={6000}
						onClose={handleCloseMessage}
					>
						<Alert
							severity={messageSeverity}
							onClose={handleCloseMessage}
						>
							{messageText}
						</Alert>
					</Snackbar>
					<Dialog
						open={openDialog}
						onClose={handleClose}
						aria-labelledby="alert-dialog-title"
						aria-describedby="alert-dialog-description"
					>
						<DialogTitle id="alert-dialog-title">
							{"Atenção!"}
						</DialogTitle>
						<DialogContent>
							<DialogContentText id="alert-dialog-description">
								Deseja realmente remover este docente?
							</DialogContentText>
						</DialogContent>
						<DialogActions>
							<Button onClick={handleNoDeleteClick}>
								Cancelar
							</Button>
							<Button onClick={handleDeleteClick} autoFocus>
								Confirmar
							</Button>
						</DialogActions>
					</Dialog>
				</Stack>
				<Box style={{ height: "500px" }}>
					<CustomDataGrid
						rows={docentes}
						columns={columns}
						pageSize={5}
						checkboxSelection={false}
						disableSelectionOnClick
						getRowId={(row) => row.codigo}
					/>
				</Box>
			</Stack>
		</Box>
	);
}
