import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Box,
	Typography,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormControlLabel,
	Checkbox,
	Alert,
	Button,
	CircularProgress,
} from "@mui/material";
import { FileCopy as FileCopyIcon } from "@mui/icons-material";

const ImportModal = ({
	open,
	onClose,
	anosSemestres,
	selectedAnoSemestreOrigem,
	onAnoSemestreOrigemChange,
	incluirDocentes,
	onIncluirDocentesChange,
	incluirOfertas,
	onIncluirOfertasChange,
	onImport,
	loading,
	error,
	selectedAnoSemestre,
}) => {
	// Filtrar anos/semestres anteriores ao atual
	const anosSemestresAnteriores = anosSemestres.filter(
		(as) =>
			as.ano < selectedAnoSemestre.ano ||
			(as.ano === selectedAnoSemestre.ano &&
				as.semestre < selectedAnoSemestre.semestre),
	);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<FileCopyIcon color="primary" />
				Importar Horários
			</DialogTitle>

			<DialogContent dividers>
				<Box sx={{ mb: 3 }}>
					<Typography variant="body1" sx={{ mb: 2 }}>
						Não foram encontrados horários para o ano/semestre
						selecionado. Deseja importar horários de um ano/semestre
						anterior?
					</Typography>

					<FormControl fullWidth sx={{ mb: 2 }}>
						<InputLabel>Ano/Semestre de Origem</InputLabel>
						<Select
							value={
								selectedAnoSemestreOrigem
									? `${selectedAnoSemestreOrigem.ano}/${selectedAnoSemestreOrigem.semestre}`
									: ""
							}
							onChange={(e) => {
								const [ano, semestre] =
									e.target.value.split("/");
								onAnoSemestreOrigemChange({
									ano: parseInt(ano),
									semestre: parseInt(semestre),
								});
							}}
							label="Ano/Semestre de Origem"
						>
							{anosSemestresAnteriores.map((as) => (
								<MenuItem
									key={`${as.ano}-${as.semestre}`}
									value={`${as.ano}/${as.semestre}`}
								>
									{as.ano}/{as.semestre}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<FormControlLabel
						control={
							<Checkbox
								checked={Boolean(incluirDocentes)}
								onChange={(e) =>
									onIncluirDocentesChange(e.target.checked)
								}
								color="primary"
							/>
						}
						label="Incluir docentes na importação"
					/>

					<Typography
						variant="body2"
						color="textSecondary"
						sx={{ mt: 1, mb: 2 }}
					>
						{incluirDocentes
							? "Os horários serão importados com os docentes originais."
							: "Os horários serão importados com o docente 'sem.professor' para que possam ser editados posteriormente."}
					</Typography>

					<FormControlLabel
						control={
							<Checkbox
								checked={Boolean(incluirOfertas)}
								onChange={(e) =>
									onIncluirOfertasChange(e.target.checked)
								}
								color="primary"
							/>
						}
						label="Incluir ofertas na importação"
					/>

					<Typography
						variant="body2"
						color="textSecondary"
						sx={{ mt: 1 }}
					>
						{incluirOfertas
							? "As ofertas (fases e turnos) serão importadas do ano/semestre de origem."
							: "Apenas os horários serão importados, sem as configurações de ofertas."}
					</Typography>

					{error && (
						<Alert severity="error" sx={{ mt: 2 }}>
							{error}
						</Alert>
					)}
				</Box>
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose} disabled={loading}>
					Cancelar
				</Button>
				<Button
					onClick={onImport}
					variant="contained"
					disabled={!selectedAnoSemestreOrigem || loading}
					startIcon={
						loading ? (
							<CircularProgress size={20} />
						) : (
							<FileCopyIcon />
						)
					}
				>
					{loading ? "Importando..." : "Importar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default ImportModal;
