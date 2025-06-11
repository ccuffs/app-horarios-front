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

export default function CCRs() {
    const [ccrs, setCCRs] = useState([]);
    const [formData, setFormData] = useState({
        id: "",
        codigo: "",
        nome: "",
        ementa: "",
    });
    const [edit, setEdit] = useState(false);
    const [openMessage, setOpenMessage] = React.useState(false);
    const [openDialog, setOpenDialog] = React.useState(false);
    const [messageText, setMessageText] = React.useState("");
    const [messageSeverity, setMessageSeverity] = React.useState("success");
    const [idDelete, setIdDelete] = React.useState(-1);

    useEffect(() => {
        getData();
    }, []);

    async function getData() {
        try {
            const res = await axios.get("/ccrs");
            console.log(res.data);
            setCCRs(res.data.ccrs);
        } catch (error) {
            console.log("Não foi possível retornar a lista de CCRs: ", error);
            setCCRs([]);
        }
    }

    function handleEdit(data) {
        setFormData(data);
        setEdit(true);
    }

    function handleDelete(row) {
        setIdDelete(row.id);
        setOpenDialog(true);
    }

    function handleInputChange(e) {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    async function handleAddOrUpdate() {
        try {
            if (edit) {
                await axios.put("/ccrs/", {
                    formData: formData,
                });
                setMessageText("CCR atualizado com sucesso!");
            } else {
                await axios.post("/ccrs", {
                    formData: {
                        codigo: formData.codigo,
                        nome: formData.nome,
                        ementa: formData.ementa,
                    },
                });

                setMessageText("CCR inserido com sucesso!");
            }
            setMessageSeverity("success");
            setFormData({
                id: "",
                codigo: "",
                nome: "",
                ementa: "",
            });
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
            ementa: "",
        });
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
            await axios.delete(`/ccrs/${idDelete}`);
            setMessageText("CCR removido com sucesso!");
            setMessageSeverity("success");
        } catch (error) {
            console.log("Nao foi possível remover o CCR no banco de dados");
            setMessageText("Falha ao remover CCR!");
            setMessageSeverity("error");
        } finally {
            setFormData({ id: "", nome: "", email: "", sala: "" });
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
        { field: "ementa", headerName: "Ementa", width: 450 },
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
                        <TextField
                            name="nome"
                            label="Nome"
                            type="text"
                            fullWidth
                            size="small"
                            value={formData.nome}
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
