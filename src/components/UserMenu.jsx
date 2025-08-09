import React, { useState } from "react";
import {
	Box,
	IconButton,
	Menu,
	MenuItem,
	Typography,
	Avatar,
	Divider,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../contexts/AuthContext";

export default function UserMenu() {
	const [anchorEl, setAnchorEl] = useState(null);
	const { usuario } = useAuth();

	const handleMenu = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleLogout = () => {
		handleClose();
		localStorage.removeItem("auth_token");
		window.location.reload();
	};

	if (!usuario) {
		return null;
	}

	return (
		<Box>
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
				<MenuItem onClick={handleLogout}>
					<LogoutIcon sx={{ mr: 1 }} />
					Sair
				</MenuItem>
			</Menu>
		</Box>
	);
}
