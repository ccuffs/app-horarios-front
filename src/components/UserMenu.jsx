import React, { useState } from "react";
import {
	Box,
	IconButton,
	Menu,
	MenuItem,
	Typography,
	Avatar,
	Divider,
	Switch,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

import { useAuth } from "../contexts/AuthContext";
import { useThemeContext } from "./CustomThemeProvider";
import { useTheme } from "@mui/material";
import requestCacheService from "../services/request-cache-service";

export default function UserMenu() {
	const [anchorEl, setAnchorEl] = useState(null);
	const { usuario, logout } = useAuth();
	const { toggleTheme } = useThemeContext();
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === "dark";

	const handleMenu = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleClearCache = () => {
		handleClose();
		requestCacheService.limparCache();
	};

	const handleLogout = () => {
		handleClose();
		logout();
	};

	if (!usuario) {
		return null;
	}

	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 0.5,
				}}
			>
				{isDarkMode ? (
					<DarkModeIcon sx={{ fontSize: 20 }} />
				) : (
					<LightModeIcon sx={{ fontSize: 20 }} />
				)}
				<Switch
					checked={isDarkMode}
					onChange={toggleTheme}
					size="small"
					sx={{
						"& .MuiSwitch-thumb": {
							bgcolor: "background.paper",
						},
					}}
				/>
			</Box>
			<IconButton
				size="large"
				aria-label="menu do usuário"
				aria-controls="menu-appbar"
				aria-haspopup="true"
				onClick={handleMenu}
				color="inherit"
			>
				<Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
					{usuario.nome ? usuario.nome.charAt(0).toUpperCase() : "U"}
				</Avatar>
			</IconButton>
			<Menu
				id="menu-appbar"
				anchorEl={anchorEl}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				keepMounted
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				open={Boolean(anchorEl)}
				onClose={handleClose}
			>
				<MenuItem disabled>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-start",
						}}
					>
						<Typography
							variant="subtitle2"
							sx={{ fontWeight: "bold" }}
						>
							{usuario.nome}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							ID: {usuario.id}
						</Typography>
			</Box>
		</MenuItem>
		<Divider />
		<MenuItem onClick={handleClearCache}>
			<DeleteSweepIcon sx={{ mr: 1 }} />
			Limpar Cache
		</MenuItem>
		<MenuItem onClick={handleLogout}>
			<LogoutIcon sx={{ mr: 1 }} />
			Sair
		</MenuItem>
	</Menu>
		</Box>
	);
}
