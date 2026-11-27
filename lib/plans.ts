/** Propuesta de planes. Precios en USD por mes; el anual equivale a ~2 meses gratis. */
export type PlanId = "free" | "pro" | "business" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  /** USD per month billed monthly; null = "Contactanos". */
  monthly: number | null;
  /** USD per month billed yearly. */
  yearly: number | null;
  highlighted?: boolean;
  limits: string[];
  /** Features that are new in this plan compared to the previous one. */
  features: string[];
};

export const EXTRA_RESPONSE_PRICE_USD = 0.02;

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratis",
    tagline: "Para probar la herramienta y armar encuestas sencillas.",
    monthly: 0,
    yearly: 0,
    limits: ["3 encuestas", "10 preguntas por encuesta", "100 respuestas por mes", "1 enlace por encuesta"],
    features: [
      "Canvas visual con ramificación por respuesta",
      "Tipos de pregunta básicos",
      "Resumen por pregunta y respuestas individuales",
      "Exportar a CSV",
      "Aviso «Hecho con Visualquery» en la encuesta",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para quien encuesta seguido y quiere una imagen propia.",
    monthly: 12,
    yearly: 10,
    highlighted: true,
    limits: ["Encuestas y preguntas ilimitadas", "2.000 respuestas por mes", "Hasta 5 enlaces por encuesta"],
    features: [
      "Todos los tipos de pregunta (ranking, matrices, mejor/peor, imagen…)",
      "Diseño completo: logo, colores, tipografías, fondos y pantallas de bienvenida/cierre",
      "Sin aviso de Visualquery",
      "Final y descalificación por respuesta, con redirección",
      "Por enlace: contraseña, límite de respuestas y fecha de cierre",
      "Vista previa para redes, código QR e incrustar en tu sitio",
      "Centro de notificaciones",
      "Filtros, comparar, mostrar y vistas guardadas",
      "Borrar respuestas",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Para estudios con segmentación y control de muestra.",
    monthly: 32,
    yearly: 27,
    limits: ["20.000 respuestas por mes", "Enlaces ilimitados por encuesta"],
    features: [
      "Todo lo de Pro",
      "Cupos por opción (cierra una opción al llenarse)",
      "Variables personalizadas capturadas desde el enlace",
      "Filtros por variable y por tiempo de respuesta",
      "Flujo de respuestas (por dónde avanzó cada encuestado)",
      "Modo test con puntaje",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Volumen alto, necesidades a medida.",
    monthly: null,
    yearly: null,
    limits: ["Respuestas a medida", "Soporte prioritario"],
    features: ["Todo lo de Business", "Acuerdo y facturación a medida", "Implementaciones y migración asistida"],
  },
];

/** Planned, not built yet: shown as "Próximamente" so nothing is promised as available. */
export const COMING_SOON = [
  "Exportar a Excel y PDF",
  "Invitaciones por correo",
  "Encuestas en varios idiomas",
  "Equipos y permisos",
  "Integraciones y API",
  "Análisis de texto con IA",
];

export function yearlySavingsPercent(plan: Plan): number {
  if (!plan.monthly || !plan.yearly) return 0;
  return Math.round((1 - plan.yearly / plan.monthly) * 100);
}
