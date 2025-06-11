import React from "react";
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Button,
    Menu,
    MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";

const linkStyle = {
    // margin: "1rem",
    textDecoration: "none",
    // color: 'blue'
};

function Navbar() {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const navigate = useNavigate();

    function handleMenu(event) {
        setAnchorEl(event.currentTarget);
    }

    function handleClose() {
        setAnchorEl(null);
    }
    function handleClickCCRs() {
        navigate("/ccrs");
        setAnchorEl(null);
    }

    function handleClickCursos() {
        navigate("/cursos");
        setAnchorEl(null);
    }

    function handleClickProfessores() {
        navigate("/professores");
        setAnchorEl(null);
    }

    return (
        <div>
            <AppBar position="static" style={{ width: "100%" }}>
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                        onClick={handleMenu}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ flexGrow: 1 }}
                    >
                        Construção de Horários
                    </Typography>
                    <Button color="inherit">Login</Button>
                </Toolbar>
            </AppBar>
            <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
                open={open}
                onClose={handleClose}
            >
                <MenuItem onClick={handleClickCCRs}>CCRs</MenuItem>
                <MenuItem onClick={handleClickCursos}>Cursos</MenuItem>
                <MenuItem onClick={handleClickProfessores}>
                    Professores
                </MenuItem>
            </Menu>
        </div>
    );
}

export default Navbar;
