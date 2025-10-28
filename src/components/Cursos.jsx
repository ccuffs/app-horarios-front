import React from "react";
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
import { useCursos } from "../hooks/useCursos.js";

export default function Cursos() {
	const {
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
	} = useCursos();

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
