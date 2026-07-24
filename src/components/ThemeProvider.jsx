"use client";

import { createContext, useContext, useState, useEffect, useCallback, Fragment } from "react";
import { applyFanColors, resetTheme, sanitizeFanColors } from "@/lib/theme";

// ── Fanfarben-Theme (Vereinsfarben) ─────────────────────────
// Hält die gewählten Vereinsfarben (localStorage) und legt sie über
// applyFanColors() auf die gemeinsamen Akzent-Tokens. Da die Screens diese
// Tokens als reine Werte lesen (kein Kontext), wird die Kind-Ebene bei jeder
// Änderung über einen wechselnden `key` neu gemountet — so lesen alle Screens
// die neuen Farben, ohne dass eine einzige Screen-Datei angefasst werden muss.
const KEY = "tqs.theme.v1";

const ThemeCtx = createContext({ fanColors: [], setFanColors: () => {}, reset: () => {} });
export const useTheme = () => useContext(ThemeCtx);

function load() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? sanitizeFanColors(JSON.parse(raw)) : [];
  } catch { return []; }
}

export default function ThemeProvider({ children }) {
  const [fanColors, setColors] = useState([]);
  const [version, setVersion] = useState(0);

  // Erst NACH der Hydration anwenden: SSR und erster Client-Render bleiben auf
  // den Grundfarben → keine Hydration-Diskrepanz. Danach ggf. Remount aufs Theme.
  useEffect(() => {
    const saved = load();
    if (saved.length) {
      applyFanColors(saved);
      setColors(saved);
      setVersion((v) => v + 1);
    }
  }, []);

  const setFanColors = useCallback((next) => {
    const clean = sanitizeFanColors(next);
    if (clean.length) {
      applyFanColors(clean);
      try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch {}
    } else {
      resetTheme();
      try { localStorage.removeItem(KEY); } catch {}
    }
    setColors(clean);
    setVersion((v) => v + 1); // Remount → Screens lesen die aktualisierten Tokens
  }, []);

  const reset = useCallback(() => setFanColors([]), [setFanColors]);

  return (
    <ThemeCtx.Provider value={{ fanColors, setFanColors, reset }}>
      <Fragment key={version}>{children}</Fragment>
    </ThemeCtx.Provider>
  );
}
