// import Grid from '@mui/material/Grid'; // Grid version 1

import Grid from "@mui/material/Unstable_Grid2"; // Grid version 2

import { Container, Stack, CssBaseline } from "@mui/material";
import { Route, Routes } from "react-router-dom";

import Navbar from "./Navbar";

import axios from "axios";
import Cursos from "./Cursos";
import CCRs from "./CCRs";
import Professores from "./Professores";
import Horarios from "./Horarios";
import CustomThemeProvider from "./CustomThemeProvider";
import ThemeSwitch from "./ThemeSwitch";
axios.defaults.baseURL = process.env.REACT_APP_API_URL;
axios.defaults.headers.common["Content-Type"] =
    "application/json;charset=utf-8";

function App() {
    return (
        <CustomThemeProvider>
            <ThemeSwitch />
            <Container spacing={2}>
                <CssBaseline />
                <Stack spacing={2}>
                    <Grid md={12}>
                        <Navbar />
                    </Grid>
                    <Grid md={12}>
                        <Routes>
                            <Route path="/" element={<Horarios />} />
                            <Route path="ccrs" element={<CCRs />} />
                            <Route path="cursos" element={<Cursos />} />
                            <Route
                                path="professores"
                                element={<Professores />}
                            />
                        </Routes>
                    </Grid>
                </Stack>
            </Container>
        </CustomThemeProvider>
    );
}

export default App;
