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
    Snackbar,
    Stack,
    TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export default function Professores() {
    const [professores, setProfessores] = useState([]);
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
    const [idDelete, setIdDelete] = React.useState('');

    useEffect(() => {
        getData();
    }, []);

    async function getData() {
        try {
            const res = await axios.get("/docentes");

            setProfessores(res.data.docentes);
        } catch (error) {
            console.log(
                "Não foi possível retornar a lista de professores: ",
                error
            );
            setProfessores([]);
        }
    }

    function handleEdit(data) {
        setFormData({
            codigo: data.codigo || "",
            nome: data.nome || "",
            email: data.email || "",
            sala: data.sala !== null ? data.sala.toString() : "",
        });
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
        try {
            // Prepara os dados convertendo strings vazias para null onde apropriado
            const dataToSend = {
                codigo: formData.codigo,
                nome: formData.nome,
                email: formData.email,
                sala: formData.sala === "" ? null : parseInt(formData.sala) || null,
            };

            if (edit) {
                await axios.put("/docentes/", {
                    formData: dataToSend,
                });
                setMessageText("Docente atualizado com sucesso!");
            } else {
                await axios.post("/docentes", {
                    formData: dataToSend,
                });

                setMessageText("Docente inserido com sucesso!");
            }
            setMessageSeverity("success");
            setFormData({ codigo: "", nome: "", email: "", sala: "" });
            setEdit(false);
        } catch (error) {
            console.log("Nao foi possível inserir o docente no banco de dados");
            setMessageText("Falha ao gravar docente!");
            setMessageSeverity("error");
        } finally {
            setOpenMessage(true);
            await getData();
        }
    }

    function handleCancelClick() {
        setEdit(false);
        setFormData({ codigo: "", nome: "", email: "", sala: "" });
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
            await axios.delete(`/docentes/${idDelete}`);
            setMessageText("Docente removido com sucesso!");
            setMessageSeverity("success");
        } catch (error) {
            console.log("Nao foi possível remover o docente no banco de dados");
            setMessageText("Falha ao remover docente!");
            setMessageSeverity("error");
        } finally {
            setFormData({ codigo: "", nome: "", email: "", sala: "" });
            setOpenDialog(false);
            setOpenMessage(true);
            await getData();
        }
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
                                Disagree
                            </Button>
                            <Button onClick={handleDeleteClick} autoFocus>
                                Agree
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Stack>
                <Box style={{ height: "500px" }}>
                    <DataGrid
                        rows={professores}
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

