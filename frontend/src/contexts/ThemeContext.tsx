import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
  PaletteMode,
} from "@mui/material";
import { appTheme } from "../styles/theme";

interface ThemeContextValue {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  toggleColorMode: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

const STORAGE_KEY = "app-color-mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as PaletteMode | null;
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const toggleColorMode = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  const theme = useMemo(() => appTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
