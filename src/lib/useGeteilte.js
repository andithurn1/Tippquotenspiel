"use client";

import { useEffect, useState } from "react";
import { getStore } from "@/lib/store";

// ============================================================
//  GETEILTE REGELWERKE LADEN — eine Stelle für alle Listen
//
//  🔴 Andi am 24.08.2026 zur Bibliothek: „oben auch filter mit relevanz etc
//  und suchenfunktion". Bis hierher konnte die Bibliothek nur zeigen, was im
//  Haus liegt — geteilte Codes waren einzeln abrufbar (`getPresetByCode`),
//  aber nicht auflistbar. „Beliebteste Auswahl" war damit nicht ungebaut,
//  sondern unmöglich.
//
//  ⚠️ Warum ein Hook und nicht ein Aufruf je Screen: sonst laden zwei Listen
//  mit zwei Sortierungen und zeigen verschiedene Reihenfolgen derselben
//  Sache — die zweite Wahrheit aus CLAUDE.md, nur für Listen.
//
//  ⚠️ `sortierung` wandert bewusst IN den Store und wird nicht hier sortiert:
//  Supabase kann nach `uebernahmen` ordnen, ohne alles zu übertragen. Wer
//  hier sortierte, müsste erst alles holen.
// ============================================================

export function useGeteilte({ sortierung = "beliebt", text = "", aktiv = true } = {}) {
  const [liste, setListe] = useState([]);
  const [laedt, setLaedt] = useState(false);
  // 🔴 Getrennt vom leeren Ergebnis: „noch keiner hat etwas geteilt" und
  // „wir kommen gerade nicht an die Liste" sehen sonst gleich aus, und die
  // Oberfläche behauptet eine Leere, die sie nicht kennt.
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    if (!aktiv) return undefined;
    let live = true;
    setLaedt(true); setFehler(false);
    const store = getStore();
    // Ältere Store-Fassungen ohne die Methode dürfen nicht abstürzen — sie
    // liefern dann eben nichts, und die Haus-Einträge stehen trotzdem da.
    const p = store.listPresets
      ? store.listPresets({ sortierung, text })
      : Promise.resolve([]);
    p.then((r) => { if (live) setListe(Array.isArray(r) ? r : []); })
      .catch(() => { if (live) { setListe([]); setFehler(true); } })
      .finally(() => { if (live) setLaedt(false); });
    return () => { live = false; };
  }, [sortierung, text, aktiv]);

  return { geteilte: liste, laedt, fehler };
}

export default useGeteilte;
