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
import { DataGrid } from "@mui/x-data-grid";
import ofertasController from "../controllers/ofertas-controller.js";
import ofertasService from "../services/ofertas-service.js";

export default function Ofertas() {
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
	const [openMessage, setOpenMessage] = React.useState(false);
	const [openDialog, setOpenDialog] = React.useState(false);
	const [messageText, setMessageText] = React.useState("");
	const [messageSeverity, setMessageSeverity] = React.useState("success");
	const [deleteData, setDeleteData] = React.useState(null);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			const { ofertas: ofertasData, cursos: cursosData } =
				await ofertasController.loadOfertasAndCursos();
			setOfertas(ofertasData);
			setCursos(cursosData);
		} catch (error) {
			setOfertas([]);
			setCursos([]);
		}
	};

	async function getData() {
		try {
			const ofertasData = await ofertasService.getOfertas();
			setOfertas(ofertasData);
		} catch (error) {
			setOfertas([]);
		}
	}

	function handleEdit(data) {
		const editData = ofertasController.prepareEditData(data);
		setFormData(editData);
		setEdit(true);
	}

	function handleDelete(row) {
		const deleteDataPrepared = ofertasController.prepareDeleteData(row);
		setDeleteData(deleteDataPrepared);
		setOpenDialog(true);
	}

	function handleInputChange(e) {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	}

	async function handleAddOrUpdate() {
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
		);

		if (result.success) {
			setMessageText(result.message);
			setMessageSeverity("success");
			setFormData(ofertasController.getResetFormData());
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
		setFormData(ofertasController.getResetFormData());
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
	}

	function handleNoDeleteClick() {
		setOpenDialog(false);
	}

	const columns = [
		{ field: "ano", headerName: "Ano", width: 100 },
		{ field: "semestre", headerName: "Semestre", width: 100 },
		{
			field: "curso",
			headerName: "Curso",
			width: 300,
			renderCell: (params) =>
				params.row.curso ? params.row.curso.nome : "N/A",
		},
		{ field: "fase", headerName: "Fase", width: 100 },
		{
			field: "turno",
			headerName: "Turno",
			width: 130,
			renderCell: (params) => {
				const turnos = {
					M: "Matutino",
					V: "Vespertino",
					I: "Integral",
					N: "Noturno",
				};
				return turnos[params.value] || params.value;
			},
		},
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
					<Stack spacing={2} direction="row" alignItems="center">
						<TextField
							name="ano"
							label="Ano"
							type="text"
							size="small"
							value={formData.ano}
							onChange={handleInputChange}
							disabled={edit}
						/>
						<FormControl size="small">
							<InputLabel id="semestre-select-label">
								Semestre
							</InputLabel>
							<Select
								labelId="semestre-select-label"
								id="semestre-select"
								value={formData.semestre}
								label="Semestre"
								onChange={handleInputChange}
								name="semestre"
								disabled={edit}
								sx={{ minWidth: 120 }}
							>
								<MenuItem value="1">1</MenuItem>
								<MenuItem value="2">2</MenuItem>
							</Select>
						</FormControl>
						<TextField
							name="fase"
							label="Fase"
							type="text"
							size="small"
							value={formData.fase}
							onChange={handleInputChange}
							disabled={edit}
						/>
					</Stack>
					<Stack spacing={2} direction="row" alignItems="center">
						<FormControl fullWidth size="small">
							<InputLabel id="curso-select-label">
								Curso
							</InputLabel>
							<Select
								labelId="curso-select-label"
								id="curso-select"
								value={formData.id_curso}
								label="Curso"
								onChange={handleInputChange}
								name="id_curso"
								disabled={edit}
							>
								{cursos.map((curso) => (
									<MenuItem
										key={curso.id}
										value={curso.id.toString()}
									>
										{curso.nome}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<FormControl fullWidth size="small">
							<InputLabel id="turno-select-label">
								Turno
							</InputLabel>
							<Select
								labelId="turno-select-label"
								id="turno-select"
								value={formData.turno}
								label="Turno"
								onChange={handleInputChange}
								name="turno"
							>
								<MenuItem value="M">M - Matutino</MenuItem>
								<MenuItem value="V">V - Vespertino</MenuItem>
								<MenuItem value="I">I - Integral</MenuItem>
								<MenuItem value="N">N - Noturno</MenuItem>
							</Select>
						</FormControl>
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
								Deseja realmente remover esta oferta?
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
					<DataGrid
						rows={ofertas}
						columns={columns}
						pageSize={5}
						checkboxSelection={false}
						disableSelectionOnClick
						getRowId={(row, index) =>
							`${row.ano}-${row.semestre}-${row.id_curso}-${row.fase}-${index}`
						}
					/>
				</Box>
			</Stack>
		</Box>
	);
}
