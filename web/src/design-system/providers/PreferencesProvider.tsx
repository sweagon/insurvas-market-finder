import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";
export type Density = "comfortable" | "compact";
export type Palette = "default" | "colorblind";

interface PreferencesValue {
  theme: Theme;
  density: Density;
  palette: Palette;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setDensity: (d: Density) => void;
  toggleDensity: () => void;
  setPalette: (p: Palette) => void;
  setReduceMotion: (v: boolean) => void;
  setReduceTransparency: (v: boolean) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

/** Persistence is always wrapped: storage can throw (private mode, quota). */
function read<T extends string>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return (v as T) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* empty-state fallback: the UI still works, it just will not remember */
  }
}

function systemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

function initialTheme(): Theme {
  if (typeof document !== "undefined" && document.documentElement.dataset.theme) {
    return document.documentElement.dataset.theme as Theme;
  }
  return read<Theme>("insurvas.theme", systemTheme());
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [density, setDensityState] = useState<Density>(() =>
    read<Density>("insurvas.density", "comfortable"),
  );
  const [palette, setPaletteState] = useState<Palette>(() =>
    read<Palette>("insurvas.palette", "default"),
  );
  const [reduceMotion, setReduceMotionState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("insurvas.reduceMotion") === "1";
    } catch {
      return false;
    }
  });
  const [reduceTransparency, setReduceTransparencyState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("insurvas.reduceTransparency") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    write("insurvas.theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.density = density;
    write("insurvas.density", density);
  }, [density]);
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    write("insurvas.palette", palette);
  }, [palette]);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? "1" : "0";
    write("insurvas.reduceMotion", reduceMotion ? "1" : "0");
  }, [reduceMotion]);
  useEffect(() => {
    document.documentElement.dataset.reducedTransparency = reduceTransparency ? "1" : "0";
    write("insurvas.reduceTransparency", reduceTransparency ? "1" : "0");
  }, [reduceTransparency]);

  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );
  const toggleDensity = useCallback(
    () => setDensityState((d) => (d === "comfortable" ? "compact" : "comfortable")),
    [],
  );

  const value = useMemo<PreferencesValue>(
    () => ({
      theme,
      density,
      palette,
      reduceMotion,
      reduceTransparency,
      setTheme: setThemeState,
      toggleTheme,
      setDensity: setDensityState,
      toggleDensity,
      setPalette: setPaletteState,
      setReduceMotion: setReduceMotionState,
      setReduceTransparency: setReduceTransparencyState,
    }),
    [theme, density, palette, reduceMotion, reduceTransparency, toggleTheme, toggleDensity],
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
