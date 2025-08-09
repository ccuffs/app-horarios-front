import React, { createContext, useContext, useState, useMemo } from "react";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";

// Contexto para o tema
const ThemeContext = createContext({
  toggleTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

// Cores customizadas
export const customColors = {
  darkGray: "#454646",
  orange: "#fdae16",
  teal: "#20707c",
  gunmetal: "333a3f",
  tiffanyBlue: "#70C8B7",
  outerSpace: "#4B5555",
  goldenBrown: "#886727",
  whiteSmoke: "#f5f4f6",
  glaucous: "#5984c3",
  platinum: "#e4e4e5",
  jet: "#373535",
  frenchGray: "#b5b6be",
  veronica: "#a147d8",
  eerieBlack: "#1d1b1b",
  trueBlue: "#3365b3",
  raisinBlack: "#272829",
  taupe: "#4a4342",
};

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
          primary: {
            main: customColors.teal,
            light: customColors.tiffanyBlue,
            dark: customColors.darkGray,
          },
          secondary: {
            main: customColors.orange,
            light: "#ffe082",
            dark: "#f57c00",
          },
          info: {
            main: customColors.glaucous,
            light: customColors.frenchGray,
            dark: customColors.trueBlue,
          },
          warning: {
            main: customColors.orange,
            light: "#ffe082",
            dark: "#e69500",
          },
          error: {
            main: "#d32f2f",
            light: "#ef5350",
            dark: "#c62828",
          },
          success: {
            main: customColors.tiffanyBlue,
            light: "#81c784",
            dark: customColors.teal,
          },
          background: {
            default:
              mode === "light"
                ? customColors.whiteSmoke
                : customColors.raisinBlack,
            paper: mode === "light" ? "#ffffff" : customColors.jet,
          },
          text: {
            primary:
              mode === "light"
                ? customColors.eerieBlack
                : customColors.whiteSmoke,
            secondary:
              mode === "light" ? customColors.taupe : customColors.platinum,
          },
          divider:
            mode === "light" ? customColors.platinum : customColors.frenchGray,
          // Cores customizadas adicionais acessíveis via theme.palette
          custom: {
            veronica: customColors.veronica,
            glaucous: customColors.glaucous,
            trueBlue: customColors.trueBlue,
            frenchGray: customColors.frenchGray,
            raisinBlack: customColors.raisinBlack,
            taupe: customColors.taupe,
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            color: mode === "light" ? customColors.darkGray : "#ffffff",
          },
          h2: {
            color: mode === "light" ? customColors.darkGray : "#ffffff",
          },
          h3: {
            color:
              mode === "light" ? customColors.teal : customColors.tiffanyBlue,
          },
          h4: {
            color:
              mode === "light" ? customColors.teal : customColors.tiffanyBlue,
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: customColors.teal,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                textTransform: "none",
                fontWeight: 600,
              },
              containedPrimary: {
                backgroundColor: customColors.teal,
                "&:hover": {
                  backgroundColor: customColors.darkGray,
                },
              },
              containedSecondary: {
                backgroundColor: customColors.orange,
                color: "#ffffff",
                "&:hover": {
                  backgroundColor: "#e69500",
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow:
                  mode === "light"
                    ? "0 2px 8px rgba(0,0,0,0.1)"
                    : "0 2px 8px rgba(0,0,0,0.3)",
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused fieldset": {
                    borderColor: customColors.teal,
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: customColors.teal,
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                backgroundColor: customColors.tiffanyBlue,
                color: customColors.darkGray,
                "&:hover": {
                  backgroundColor: customColors.teal,
                  color: "#ffffff",
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                border: `1px solid ${mode === "light" ? customColors.platinum : customColors.frenchGray}`,
              },
            },
          },
          MuiTableHead: {
            styleOverrides: {
              root: {
                backgroundColor:
                  mode === "light"
                    ? customColors.glaucous
                    : customColors.trueBlue,
                "& .MuiTableCell-head": {
                  color: "#ffffff",
                  fontWeight: 600,
                },
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                "&:nth-of-type(odd)": {
                  backgroundColor:
                    mode === "light"
                      ? customColors.whiteSmoke
                      : customColors.raisinBlack,
                },
                "&:hover": {
                  backgroundColor:
                    mode === "light"
                      ? customColors.platinum
                      : customColors.taupe,
                },
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              standardInfo: {
                backgroundColor: customColors.glaucous,
                color: "#ffffff",
              },
              standardWarning: {
                backgroundColor: customColors.orange,
                color: "#ffffff",
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 500,
                "&.Mui-selected": {
                  color: customColors.veronica,
                },
              },
            },
          },
          MuiTabs: {
            styleOverrides: {
              indicator: {
                backgroundColor: customColors.veronica,
                height: 3,
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                color:
                  mode === "light"
                    ? customColors.platinum
                    : customColors.frenchGray,
                "&:hover": {
                  backgroundColor:
                    mode === "light"
                      ? customColors.platinum
                      : customColors.taupe,
                  color: customColors.veronica,
                },
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={{ toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
