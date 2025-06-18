// import Grid from '@mui/material/Grid'; // Grid version 1

import Grid from "@mui/material/Unstable_Grid2"; // Grid version 2

import { Container, Stack, Box, Toolbar } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import React from "react";

import Navbar from "./Navbar";

import axios from "axios";
import Cursos from "./Cursos";
import CCRs from "./CCRs";
import Professores from "./Professores";
import Ofertas from "./Ofertas";
import Horarios from "./Horarios";
import HorariosView from "./HorariosView";
import CustomThemeProvider from "./CustomThemeProvider";
import ThemeSwitch from "./ThemeSwitch";

axios.defaults.baseURL = process.env.REACT_APP_API_URL;
axios.defaults.headers.common["Content-Type"] =
    "application/json;charset=utf-8";

// Contexto para gerenciar o estado do drawer
export const DrawerContext = React.createContext();

function App() {
    const [desktopOpen, setDesktopOpen] = React.useState(false);

    return (
        <CustomThemeProvider>
            <DrawerContext.Provider value={{ desktopOpen, setDesktopOpen }}>
                <Box sx={{ display: 'flex' }}>
                    <Navbar />
                    <Box
                        component="main"
                        sx={{
                            flexGrow: 1,
                            p: 3,
                            width: { md: desktopOpen ? `calc(100% - 240px)` : '100%' },
                            transition: (theme) => theme.transitions.create(['width', 'margin'], {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.leavingScreen,
                            }),
                        }}
                    >
                        <Toolbar /> {/* Spacing for AppBar */}
                        <ThemeSwitch />
                        <Container maxWidth="xl" sx={{ mt: 2 }}>
                            <Routes>
                                <Route path="/" element={<Horarios />} />
                                <Route path="visualizar-horarios" element={<HorariosView />} />
                                <Route path="ccrs" element={<CCRs />} />
                                <Route path="cursos" element={<Cursos />} />
                                <Route
                                    path="professores"
                                    element={<Professores />}
                                />
                                <Route
                                    path="ofertas"
                                    element={<Ofertas />}
                                />
                            </Routes>
                        </Container>
                    </Box>
                </Box>
            </DrawerContext.Provider>
        </CustomThemeProvider>
    );
}

export default App;
