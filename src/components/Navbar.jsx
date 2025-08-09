import React from "react";
import {
	AppBar,
	Toolbar,
	IconButton,
	Typography,
	Button,
	Drawer,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Box,
	useTheme,
	useMediaQuery,
	Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { DrawerContext } from "./App";
import { useAuth } from "../contexts/AuthContext";
import PermissionContext from "../contexts/PermissionContext";
import { Permissoes } from "../enums/permissoes";
import UserMenu from "./UserMenu";

const drawerWidth = 240;

const linkStyle = {
	// margin: "1rem",
	textDecoration: "none",
	// color: 'blue'
};

function Navbar() {
	const [mobileOpen, setMobileOpen] = React.useState(false);
	const { desktopOpen, setDesktopOpen } = React.useContext(DrawerContext);
	const { isAuthenticated, gruposUsuario } = useAuth();
	const navigate = useNavigate();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));

	function handleDrawerToggle() {
		setMobileOpen(!mobileOpen);
	}

	function handleDesktopDrawerToggle() {
		setDesktopOpen(!desktopOpen);
	}

	function handleClickHome() {
		navigate("/");
		if (isMobile) setMobileOpen(false);
	}

	function handleClickCCRs() {
		navigate("/ccrs");
		if (isMobile) setMobileOpen(false);
	}

	function handleClickCursos() {
		navigate("/cursos");
		if (isMobile) setMobileOpen(false);
	}

	function handleClickProfessores() {
		navigate("/professores");
		if (isMobile) setMobileOpen(false);
	}

	function handleClickOfertas() {
		navigate("/ofertas");
		if (isMobile) setMobileOpen(false);
	}

	function handleClickVisualizarHorarios() {
		navigate("/visualizar-horarios");
		if (isMobile) setMobileOpen(false);
	}

	const drawerContent = (
		<Box sx={{ overflow: "auto" }}>
			<Toolbar>
				<Typography variant="h6" noWrap component="div">
					Menu
				</Typography>
			</Toolbar>
			<Divider />
			<List>
				<PermissionContext
					permissoes={[
						Permissoes.HORARIOS.VISUALIZAR,
						Permissoes.HORARIOS.VISUALIZAR_TODOS,
					]}
					showError={false}
				>
					<ListItem disablePadding>
						<ListItemButton onClick={handleClickHome}>
							<ListItemText primary="Horários" />
						</ListItemButton>
					</ListItem>
				</PermissionContext>
				<ListItem disablePadding>
					<ListItemButton onClick={handleClickVisualizarHorarios}>
						<ListItemText primary="Visualizar Horários" />
					</ListItemButton>
				</ListItem>
				<PermissionContext
					permissoes={[
						Permissoes.CCR.VISUALIZAR,
						Permissoes.CCR.VISUALIZAR_TODAS,
					]}
					showError={false}
				>
					<ListItem disablePadding>
						<ListItemButton onClick={handleClickCCRs}>
							<ListItemText primary="CCRs" />
						</ListItemButton>
					</ListItem>
				</PermissionContext>
				<PermissionContext
					permissoes={[
						Permissoes.OFERTAS_CURSO.VISUALIZAR,
						Permissoes.OFERTAS_CURSO.VISUALIZAR_TODOS,
					]}
					showError={false}
				>
					<ListItem disablePadding>
						<ListItemButton onClick={handleClickCursos}>
							<ListItemText primary="Cursos" />
						</ListItemButton>
					</ListItem>
				</PermissionContext>
				<PermissionContext
					permissoes={[
						Permissoes.DOCENTES.VISUALIZAR,
						Permissoes.DOCENTES.VISUALIZAR_TODOS,
					]}
					showError={false}
				>
					<ListItem disablePadding>
						<ListItemButton onClick={handleClickProfessores}>
							<ListItemText primary="Professores" />
						</ListItemButton>
					</ListItem>
				</PermissionContext>
				<PermissionContext
					permissoes={[
						Permissoes.OFERTAS_CURSO.VISUALIZAR,
						Permissoes.OFERTAS_CURSO.VISUALIZAR_TODOS,
					]}
					showError={false}
				>
					<ListItem disablePadding>
						<ListItemButton onClick={handleClickOfertas}>
							<ListItemText primary="Ofertas" />
						</ListItemButton>
					</ListItem>
				</PermissionContext>
			</List>
		</Box>
	);

	return (
		<Box sx={{ display: "flex" }}>
			<AppBar
				position="fixed"
				sx={{
					width: {
						md:
							isAuthenticated && desktopOpen
								? `calc(100% - ${drawerWidth}px)`
								: "100%",
					},
					ml: {
						md:
							isAuthenticated && desktopOpen
								? `${drawerWidth}px`
								: 0,
					},
					zIndex: (theme) => theme.zIndex.drawer + 1,
					transition: theme.transitions.create(["width", "margin"], {
						easing: theme.transitions.easing.sharp,
						duration: theme.transitions.duration.leavingScreen,
					}),
				}}
			>
				<Toolbar>
					{isAuthenticated && (
						<IconButton
							color="inherit"
							aria-label="open drawer"
							edge="start"
							onClick={
								isMobile
									? handleDrawerToggle
									: handleDesktopDrawerToggle
							}
							sx={{ mr: 2 }}
						>
							<MenuIcon />
						</IconButton>
					)}
					<Typography
						variant="h6"
						component="div"
						sx={{ flexGrow: 1, cursor: "pointer" }}
						onClick={handleClickHome}
					>
						Construção de Horários
					</Typography>
					{isAuthenticated ? (
						<UserMenu />
					) : (
						<Button
							color="inherit"
							onClick={() => navigate("/login")}
						>
							Login
						</Button>
					)}
				</Toolbar>
			</AppBar>

			{/* Mobile drawer */}
			{isAuthenticated && (
				<Drawer
					variant="temporary"
					open={mobileOpen}
					onClose={handleDrawerToggle}
					ModalProps={{
						keepMounted: true, // Better open performance on mobile.
					}}
					sx={{
						display: { xs: "block", md: "none" },
						"& .MuiDrawer-paper": {
							boxSizing: "border-box",
							width: drawerWidth,
						},
					}}
				>
					{drawerContent}
				</Drawer>
			)}

			{/* Desktop drawer */}
			{isAuthenticated && (
				<Drawer
					variant="persistent"
					open={desktopOpen}
					sx={{
						display: { xs: "none", md: "block" },
						width: desktopOpen ? drawerWidth : 0,
						flexShrink: 0,
						"& .MuiDrawer-paper": {
							width: drawerWidth,
							boxSizing: "border-box",
							transition: theme.transitions.create("width", {
								easing: theme.transitions.easing.sharp,
								duration:
									theme.transitions.duration.enteringScreen,
							}),
						},
					}}
				>
					{drawerContent}
				</Drawer>
			)}
		</Box>
	);
}

export default Navbar;
