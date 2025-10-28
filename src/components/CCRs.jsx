import React from "react";
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
import CustomDataGrid from "./CustomDataGrid.jsx";
import { useCCRs } from "../hooks/useCCRs.js";

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
	const {
		ccrs,
		cursos,
		formData,
		cursosSelecionados,
		edit,
		openMessage,
		openDialog,
		messageText,
		messageSeverity,
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
	} = useCCRs();

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
								<OutlinedInput id="select-cursos" label="Cursos" />
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
					<CustomDataGrid
						rows={ccrs}
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
