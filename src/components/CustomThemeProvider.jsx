import React, { createContext, useContext, useState, useMemo } from "react";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";

// Contexto para o tema
const ThemeContext = createContext({
    toggleTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export default function CustomThemeProvider({ children }) {
    // Estado para controlar o tema atual
    const [mode, setMode] = useState("light");

    // Alternar entre temas claro e escuro
    function toggleTheme() {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
    }

    // Memorizando o tema para evitar re-renderizações desnecessárias
    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: mode,
                },
            }),
        [mode]
    );

    return (
        <ThemeContext.Provider value={{ toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline /> {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
}
