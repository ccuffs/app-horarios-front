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
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Snackbar,
	Stack,
	TextField,
} from "@mui/material";
import CustomDataGrid from "./CustomDataGrid.jsx";
import cursosController from "../controllers/cursos-controller.js";
import cursosService from "../services/cursos-service.js";

export default function Cursos() {
	const [cursos, setCursos] = useState([]);
	const [formData, setFormData] = useState({
		id: "",
		codigo: "",
		nome: "",
		turno: "",
	});
	const [edit, setEdit] = useState(false);
	const [openMessage, setOpenMessage] = React.useState(false);
	const [openDialog, setOpenDialog] = React.useState(false);
	const [messageText, setMessageText] = React.useState("");
	const [messageSeverity, setMessageSeverity] = React.useState("success");
	const [idDelete, setIdDelete] = React.useState(-1);
	const [selectTurno, setSelectTurno] = React.useState("");

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

	function handleEdit(data) {
		const editData = cursosController.prepareEditData(data);
		const turno = cursosController.getTurnoFromData(data);
		setFormData(editData);
		setSelectTurno(turno);
		setEdit(true);
	}

	function handleDelete(row) {
		setIdDelete(row.id);
		setOpenDialog(true);
	}

	function handleInputChange(e) {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	}

	function handleSelectChange(e) {
		setSelectTurno(e.target.value);
		setFormData({ ...formData, turno: e.target.value });
	}

	async function handleAddOrUpdate() {
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
	}

	function handleCancelClick() {
		setEdit(false);
		setFormData(cursosController.getResetFormData());
		setSelectTurno(cursosController.getResetTurno());
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
	}

	function handleNoDeleteClick() {
		setOpenDialog(false);
	}

	const columns = [
		{ field: "codigo", headerName: "Código", width: 100 },
		{ field: "nome", headerName: "Nome", width: 650 },
		{ field: "turno", headerName: "Turno", width: 130 },
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
					<Stack spacing={2} direction="row">
						<TextField
							name="codigo"
							label="Código"
							type="text"
							size="small"
							value={formData.codigo}
							onChange={handleInputChange}
						/>

						<FormControl fullWidth>
							<InputLabel id="demo-simple-select-label">
								Turno
							</InputLabel>
							<Select
								labelId="demo-simple-select-label"
								id="demo-simple-select"
								value={selectTurno}
								label="Turno"
								onChange={handleSelectChange}
								size="small"
							>
								<MenuItem value="Matutino">Matutino</MenuItem>
								<MenuItem value="Vespertino">
									Vespertino
								</MenuItem>
								<MenuItem value="Integral">Integral</MenuItem>
								<MenuItem value="Noturno">Noturno</MenuItem>
							</Select>
						</FormControl>
					</Stack>
					<TextField
						name="nome"
						label="Nome"
						type="text"
						fullWidth
						size="small"
						value={formData.nome}
						onChange={handleInputChange}
					/>
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
								Deseja realmente remover este Curso?
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
						rows={cursos}
						columns={columns}
						pageSize={5}
						checkboxSelection={false}
						disableSelectionOnClick
						getRowId={(row) => row.id}
					/>
				</Box>
			</Stack>
		</Box>
	);
}
