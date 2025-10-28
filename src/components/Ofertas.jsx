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
	Typography,
} from "@mui/material";
import CustomDataGrid from "./CustomDataGrid.jsx";
import { useOfertas } from "../hooks/useOfertas.js";

export default function Ofertas() {
	const {
		ofertas,
		cursos,
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
	} = useOfertas();

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
			<Box
				sx={{
					mb: 2,
					textAlign: { xs: "center", lg: "left" },
				}}
			>
				<Typography
					variant="h4"
					sx={{
						fontSize: {
							xs: "1.75rem",
							sm: "2rem",
							lg: "2.125rem",
						},
					}}
				>
					Ofertas
				</Typography>
			</Box>
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
					<CustomDataGrid
						rows={ofertas}
						columns={columns}
						pageSize={5}
						checkboxSelection={false}
						disableSelectionOnClick
						getRowId={(row) =>
							`${row.ano}-${row.semestre}-${row.id_curso}-${row.fase}-${row.turno}`
						}
					/>
				</Box>
			</Stack>
		</Box>
	);
}
