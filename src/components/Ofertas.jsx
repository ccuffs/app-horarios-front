import React, { useState, useEffect } from "react";
import axios from "axios";

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
        getData();
        getCursos();
    }, []);

    async function getData() {
        try {
            const res = await axios.get("/ofertas");

            // Remove duplicatas baseadas na chave primária composta
            const uniqueOfertas = res.data.ofertas.filter((oferta, index, self) =>
                index === self.findIndex(o =>
                    o.ano === oferta.ano &&
                    o.semestre === oferta.semestre &&
                    o.id_curso === oferta.id_curso &&
                    o.fase === oferta.fase
                )
            );

            setOfertas(uniqueOfertas);
        } catch (error) {
            setOfertas([]);
        }
    }

    async function getCursos() {
        try {
            const res = await axios.get("/cursos");
            setCursos(res.data.cursos);
        } catch (error) {
            setCursos([]);
        }
    }

    function handleEdit(data) {
        setFormData({
            ano: data.ano?.toString() || "",
            semestre: data.semestre?.toString() || "",
            id_curso: data.id_curso?.toString() || "",
            fase: data.fase?.toString() || "",
            turno: data.turno || "",
        });
        setEdit(true);
    }

    function handleDelete(row) {
        setDeleteData({
            ano: row.ano,
            semestre: row.semestre,
            id_curso: row.id_curso,
            fase: row.fase
        });
        setOpenDialog(true);
    }

    function handleInputChange(e) {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    async function handleAddOrUpdate() {
        try {
            // Prepara os dados convertendo strings para números onde necessário
            const dataToSend = {
                ano: parseInt(formData.ano) || null,
                semestre: parseInt(formData.semestre) || null,
                id_curso: parseInt(formData.id_curso) || null,
                fase: parseInt(formData.fase) || null,
                turno: formData.turno,
            };

            if (edit) {
                await axios.put(`/ofertas/${dataToSend.ano}/${dataToSend.semestre}/${dataToSend.id_curso}/${dataToSend.fase}`, dataToSend);
                setMessageText("Oferta atualizada com sucesso!");
            } else {
                await axios.post("/ofertas", dataToSend);
                setMessageText("Oferta inserida com sucesso!");
            }
            setMessageSeverity("success");
            setFormData({ ano: "", semestre: "", id_curso: "", fase: "", turno: "" });
            setEdit(false);
        } catch (error) {
            setMessageText("Falha ao gravar oferta!");
            setMessageSeverity("error");
        } finally {
            setOpenMessage(true);
            await getData();
        }
    }

    function handleCancelClick() {
        setEdit(false);
        setFormData({ ano: "", semestre: "", id_curso: "", fase: "", turno: "" });
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
            await axios.delete(`/ofertas/${deleteData.ano}/${deleteData.semestre}/${deleteData.id_curso}/${deleteData.fase}`);
            setMessageText("Oferta removida com sucesso!");
            setMessageSeverity("success");
        } catch (error) {
            setMessageText("Falha ao remover oferta!");
            setMessageSeverity("error");
        } finally {
            setFormData({ ano: "", semestre: "", id_curso: "", fase: "", turno: "" });
            setOpenDialog(false);
            setOpenMessage(true);
            await getData();
        }
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
            renderCell: (params) => params.row.curso ? params.row.curso.nome : "N/A"
        },
        { field: "fase", headerName: "Fase", width: 100 },
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
                                    <MenuItem key={curso.id} value={curso.id.toString()}>
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
                                <MenuItem value="Matutino">Matutino</MenuItem>
                                <MenuItem value="Vespertino">Vespertino</MenuItem>
                                <MenuItem value="Integral">Integral</MenuItem>
                                <MenuItem value="Noturno">Noturno</MenuItem>
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
                        getRowId={(row, index) => `${row.ano}-${row.semestre}-${row.id_curso}-${row.fase}-${index}`}
                    />
                </Box>
            </Stack>
        </Box>
    );
}