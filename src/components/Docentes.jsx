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
	Snackbar,
	Stack,
	TextField,
} from "@mui/material";
import CustomDataGrid from "./CustomDataGrid.jsx";
import { useDocentes } from "../hooks/useDocentes.js";

export default function Docentes() {
	const {
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
	} = useDocentes();

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
