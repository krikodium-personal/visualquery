/** Idiomas de contacto, en el orden y con los códigos de SurveyMonkey (sin variantes regionales). */
export const CONTACT_LANGUAGES: { code: string; name: string }[] = [
  { code: "en", name: "Inglés" },
  { code: "zh_Hans", name: "Chino (simplificado)" },
  { code: "zh", name: "Chino (tradicional)" },
  { code: "da", name: "Danés" },
  { code: "nl", name: "Holandés" },
  { code: "fi", name: "Finlandés" },
  { code: "fr", name: "Francés" },
  { code: "de", name: "Alemán" },
  { code: "el", name: "Griego" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "Japonés" },
  { code: "ko", name: "Coreano" },
  { code: "ms", name: "Malayo" },
  { code: "no", name: "Noruego" },
  { code: "pl", name: "Polaco" },
  { code: "pt", name: "Portugués (ibérico)" },
  { code: "pt_BR", name: "Portugués (brasilero)" },
  { code: "ru", name: "Ruso" },
  { code: "es", name: "Español" },
  { code: "sv", name: "Sueco" },
  { code: "tr", name: "Turco" },
  { code: "uk", name: "Ucraniano" },
  { code: "sq", name: "Albanés" },
  { code: "ar", name: "Árabe" },
  { code: "hy", name: "Armenio" },
  { code: "eu", name: "Vasco" },
  { code: "bn", name: "Bengalí" },
  { code: "bs", name: "Bosnio" },
  { code: "bg", name: "Búlgaro" },
  { code: "ca", name: "Catalán" },
  { code: "hr", name: "Croata" },
  { code: "cs", name: "Checo" },
  { code: "et", name: "Estonio" },
  { code: "tl", name: "Filipino" },
  { code: "ka", name: "Georgiano" },
  { code: "he", name: "Hebreo" },
  { code: "hi", name: "Hindú" },
  { code: "hu", name: "Húngaro" },
  { code: "is", name: "Islandés" },
  { code: "id", name: "Indonesio" },
  { code: "ga", name: "Irlandés" },
  { code: "lv", name: "Letón" },
  { code: "lt", name: "Lituano" },
  { code: "mk", name: "Macedonio" },
  { code: "ml", name: "Malayalam" },
  { code: "fa", name: "Persa" },
  { code: "pa", name: "Punjabí" },
  { code: "ro", name: "Rumano" },
  { code: "sr", name: "Serbio" },
  { code: "sk", name: "Eslovaco" },
  { code: "sl", name: "Esloveno" },
  { code: "sw", name: "Swahili" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugo" },
  { code: "th", name: "Tailandés" },
  { code: "vi", name: "Vietnamita" },
  { code: "cy", name: "Galés" },
  { code: "gb", name: "Inglés (Reino Unido)" },
];

const norm = (value: string) =>
  value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Accepts a code ("es") or a name ("Español") and returns the code, or undefined. */
export function languageCodeOf(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const wanted = norm(value);
  return CONTACT_LANGUAGES.find((l) => norm(l.code) === wanted || norm(l.name) === wanted)?.code;
}

export function languageLabel(code: string | null): string {
  if (!code) return "";
  const language = CONTACT_LANGUAGES.find((l) => l.code === code);
  return language ? `${language.name} - ${language.code}` : code;
}
