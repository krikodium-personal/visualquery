"use client";

import { useEffect } from "react";
import {
  FONT_OPTIONS,
  googleFontHref,
  isGoogleFont,
  type FontFamily,
} from "@/lib/survey-design";

const PRECONNECT_IDS = ["survey-font-preconnect", "survey-font-preconnect-static"] as const;

function ensureGooglePreconnect() {
  if (typeof document === "undefined") return;
  if (!document.getElementById(PRECONNECT_IDS[0])) {
    const api = document.createElement("link");
    api.id = PRECONNECT_IDS[0];
    api.rel = "preconnect";
    api.href = "https://fonts.googleapis.com";
    document.head.appendChild(api);
  }
  if (!document.getElementById(PRECONNECT_IDS[1])) {
    const gstatic = document.createElement("link");
    gstatic.id = PRECONNECT_IDS[1];
    gstatic.rel = "preconnect";
    gstatic.href = "https://fonts.gstatic.com";
    gstatic.crossOrigin = "anonymous";
    document.head.appendChild(gstatic);
  }
}

function ensureFontStylesheet(fontFamily: FontFamily) {
  const href = googleFontHref(fontFamily);
  if (!href || typeof document === "undefined") return;
  const id = `survey-font-${fontFamily}`;
  if (document.getElementById(id)) return;
  ensureGooglePreconnect();
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/** Loads the selected Google Font for live / Checa / Diseño preview. */
export function SurveyFontLoader({ fontFamily }: { fontFamily: FontFamily }) {
  useEffect(() => {
    if (!isGoogleFont(fontFamily)) return;
    ensureFontStylesheet(fontFamily);
  }, [fontFamily]);

  return null;
}

/** Preloads every curated Google Font so the Tipografía dropdown can preview them. */
export function SurveyFontCatalogLoader() {
  useEffect(() => {
    for (const option of FONT_OPTIONS) {
      if (isGoogleFont(option.value)) ensureFontStylesheet(option.value);
    }
  }, []);

  return null;
}
