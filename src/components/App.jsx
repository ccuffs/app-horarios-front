// import Grid from '@mui/material/Grid'; // Grid version 1

import Grid from "@mui/material/Unstable_Grid2"; // Grid version 2

import { Container, Stack, Box, Toolbar } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import React from "react";

import Navbar from "./Navbar";
import Login from "./Login";
import ProtectedRoute from "../contexts/ProtectedRoute";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { Permissoes } from "../enums/permissoes";

import axiosInstance from "../auth/axios";
import Cursos from "./Cursos";
import CCRs from "./CCRs";
import Professores from "./Professores";
import Ofertas from "./Ofertas";
import Horarios from "./Horarios";
import HorariosView from "./HorariosView";
import CustomThemeProvider from "./CustomThemeProvider";
import ThemeSwitch from "./ThemeSwitch";

// baseURL e headers já configurados em src/auth/axios.js
// axiosInstance já configurado com interceptors de autenticação

// Contexto para gerenciar o estado do drawer
export const DrawerContext = React.createContext();

function AppContent() {
	const [desktopOpen, setDesktopOpen] = React.useState(false);
	const { isAuthenticated } = useAuth();

	return (
		<DrawerContext.Provider value={{ desktopOpen, setDesktopOpen }}>
			<Box sx={{ display: "flex" }}>
				<Navbar />
				<Box
					component="main"
					sx={{
						flexGrow: 1,
						p: 3,
						width: {
							md:
								isAuthenticated && desktopOpen
									? `calc(100% - 240px)`
									: "100%",
						},
						transition: (theme) =>
							theme.transitions.create(["width", "margin"], {
								easing: theme.transitions.easing.sharp,
								duration:
									theme.transitions.duration.leavingScreen,
							}),
					}}
				>
					<Toolbar /> {/* Spacing for AppBar */}
					<ThemeSwitch />
					<Container maxWidth="xl" sx={{ mt: 2 }}>
						<Routes>
							<Route path="/login" element={<Login />} />
							<Route
								path="/"
								element={
									<ProtectedRoute
										permissao={[
											Permissoes.HORARIOS.VISUALIZAR,
											Permissoes.HORARIOS
												.VISUALIZAR_TODOS,
										]}
									>
										<Horarios />
									</ProtectedRoute>
								}
							/>
							<Route
								path="visualizar-horarios"
								element={<HorariosView />}
							/>
							<Route
								path="ccrs"
								element={
									<ProtectedRoute
										permissao={[
											Permissoes.CCR.VISUALIZAR,
											Permissoes.CCR.VISUALIZAR_TODAS,
										]}
									>
										<CCRs />
									</ProtectedRoute>
								}
							/>
							<Route
								path="cursos"
								element={
									<ProtectedRoute
										permissao={[
											Permissoes.OFERTAS_CURSO.VISUALIZAR,
											Permissoes.OFERTAS_CURSO
												.VISUALIZAR_TODOS,
										]}
									>
										<Cursos />
									</ProtectedRoute>
								}
							/>
							<Route
								path="professores"
								element={
									<ProtectedRoute
										permissao={[
											Permissoes.DOCENTES.VISUALIZAR,
											Permissoes.DOCENTES
												.VISUALIZAR_TODOS,
										]}
									>
										<Professores />
									</ProtectedRoute>
								}
							/>
							<Route
								path="ofertas"
								element={
									<ProtectedRoute
										permissao={[
											Permissoes.OFERTAS_CURSO.VISUALIZAR,
											Permissoes.OFERTAS_CURSO
												.VISUALIZAR_TODOS,
										]}
									>
										<Ofertas />
									</ProtectedRoute>
								}
							/>
						</Routes>
					</Container>
				</Box>
			</Box>
		</DrawerContext.Provider>
	);
}

function App() {
	return (
		<AuthProvider>
			<CustomThemeProvider>
				<AppContent />
			</CustomThemeProvider>
		</AuthProvider>
	);
}

export default App;
