import React, { useState, useEffect } from "react";
import axiosInstance from "../auth/axios";

import {
	Alert,
	Box,
	Button,
	Chip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	FormControl,
	InputLabel,
	MenuItem,
	OutlinedInput,
	Select,
	Snackbar,
	Stack,
	TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
	PaperProps: {
		style: {
			maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
			width: 250,
		},
	},
};

export default function CCRs() {
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
	const [openMessage, setOpenMessage] = React.useState(false);
	const [openDialog, setOpenDialog] = React.useState(false);
	const [messageText, setMessageText] = React.useState("");
	const [messageSeverity, setMessageSeverity] = React.useState("success");
	const [idDelete, setIdDelete] = React.useState(-1);

	useEffect(() => {
		getData();
		getCursos();
	}, []);

	async function getData() {
		try {
			const res = await axiosInstance.get("/ccrs");
			setCCRs(res.ccrs);
		} catch (error) {
			console.log("Não foi possível retornar a lista de CCRs: ", error);
			setCCRs([]);
		}
	}

	async function getCursos() {
		try {
			const res = await axiosInstance.get("/cursos");
			setCursos(res.cursos);
		} catch (error) {
			console.log("Não foi possível retornar a lista de cursos: ", error);
			setCursos([]);
		}
	}

	function handleEdit(data) {
		setFormData(data);
		// Extrair os IDs dos cursos associados
		const cursosIds = data.cursos
			? data.cursos.map((curso) => curso.id)
			: [];
		setCursosSelecionados(cursosIds);
		setEdit(true);
	}

	function handleDelete(row) {
		setIdDelete(row.id);
		setOpenDialog(true);
	}

	function handleInputChange(e) {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	}

	function handleCursosChange(event) {
		const {
			target: { value },
		} = event;
		setCursosSelecionados(
			typeof value === "string" ? value.split(",") : value,
		);
	}

	async function handleAddOrUpdate() {
		try {
			if (edit) {
				await axiosInstance.put("/ccrs/", {
					formData: formData,
					cursosSelecionados: cursosSelecionados,
				});
				setMessageText("CCR atualizado com sucesso!");
			} else {
				await axiosInstance.post("/ccrs", {
					formData: {
						codigo: formData.codigo,
						nome: formData.nome,
						creditos: formData.creditos,
						ementa: formData.ementa,
					},
					cursosSelecionados: cursosSelecionados,
				});

				setMessageText("CCR inserido com sucesso!");
			}
			setMessageSeverity("success");
			setFormData({
				id: "",
				codigo: "",
				nome: "",
				creditos: 4,
				ementa: "",
			});
			setCursosSelecionados([]);
			setEdit(false);
		} catch (error) {
			console.log("Nao foi possível inserir o CCR no banco de dados");
			setMessageText("Falha ao gravar CCR!");
			setMessageSeverity("error");
		} finally {
			setOpenMessage(true);
			await getData();
		}
	}

	function handleCancelClick() {
		setEdit(false);
		setFormData({
			id: "",
			codigo: "",
			nome: "",
			creditos: 4,
			ementa: "",
		});
		setCursosSelecionados([]);
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
		try {
			console.log(idDelete);
			await axiosInstance.delete(`/ccrs/${idDelete}`);
			setMessageText("CCR removido com sucesso!");
			setMessageSeverity("success");
		} catch (error) {
			console.log("Nao foi possível remover o CCR no banco de dados");
			setMessageText("Falha ao remover CCR!");
			setMessageSeverity("error");
		} finally {
			setFormData({ id: "", codigo: "", nome: "", creditos: 4, ementa: "" });
			setOpenDialog(false);
			setOpenMessage(true);
			await getData();
		}
	}

	function handleNoDeleteClick() {
		setOpenDialog(false);
	}

	const columns = [
		{ field: "codigo", headerName: "Código", width: 120 },
		{ field: "nome", headerName: "Nome", width: 300 },
		{ field: "creditos", headerName: "Créditos", width: 100 },
		{ field: "ementa", headerName: "Ementa", width: 300 },
		{
			field: "cursos",
			headerName: "Cursos",
			width: 250,
			renderCell: (params) => (
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
					{params.row.cursos && params.row.cursos.length > 0 ? (
						params.row.cursos.map((curso) => (
							<Chip
								key={curso.id}
								label={curso.nome}
								size="small"
								variant="outlined"
							/>
						))
					) : (
						<span style={{ color: "#999" }}>Nenhum curso</span>
					)}
				</Box>
			),
		},
		{
			field: "actions",
			headerName: "Ações",
			sortable: false,
			width: 200,
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
						<TextField
							name="nome"
							label="Nome"
							type="text"
							fullWidth
							size="small"
							value={formData.nome}
							onChange={handleInputChange}
						/>
						<TextField
							name="creditos"
							label="Créditos"
							type="text"
							size="small"
							value={formData.creditos}
							onChange={handleInputChange}
						/>
					</Stack>
					<TextField
						name="ementa"
						label="Ementa"
						type="text"
						fullWidth
						size="small"
						value={formData.ementa}
						multiline
						rows={4}
						onChange={handleInputChange}
					/>
					<FormControl size="small" fullWidth>
						<InputLabel id="cursos-label">Cursos</InputLabel>
						<Select
							labelId="cursos-label"
							id="cursos-select"
							multiple
							value={cursosSelecionados}
							onChange={handleCursosChange}
							input={
								<OutlinedInput
									id="select-cursos"
									label="Cursos"
								/>
							}
							renderValue={(selected) => (
								<Box
									sx={{
										display: "flex",
										flexWrap: "wrap",
										gap: 0.5,
									}}
								>
									{selected.map((value) => {
										const curso = cursos.find(
											(c) => c.id === value,
										);
										return (
											<Chip
												key={value}
												label={
													curso ? curso.nome : value
												}
												size="small"
											/>
										);
									})}
								</Box>
							)}
							MenuProps={MenuProps}
						>
							{cursos.map((curso) => (
								<MenuItem key={curso.id} value={curso.id}>
									{curso.nome}
								</MenuItem>
							))}
						</Select>
					</FormControl>
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
								Deseja realmente remover este CCR?
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
						rows={ccrs}
						columns={columns}
						pageSize={5}
						checkboxSelection={false}
						disableSelectionOnClick
					/>
				</Box>
			</Stack>
		</Box>
	);
}
