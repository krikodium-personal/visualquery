import type { Lang } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";

type PlanText = { name: string; tagline: string; limits: string[]; features: string[] };

const es = {
  nav: {
    how: "Cómo funciona",
    features: "Funciones",
    plans: "Planes",
    faq: "Preguntas frecuentes",
    login: "Iniciar sesión",
    start: "Empezar gratis",
    mySurveys: "Ir a mis encuestas",
    mainNav: "Principal",
  },
  meta: {
    homeTitle: "Visualquery · Encuestas armadas como un mapa",
    homeDescription:
      "Crea encuestas con lógica condicional conectando preguntas como nodos en un canvas. Cada persona recorre solo el camino que le corresponde.",
  },
  hero: {
    title: "Arma tu encuesta como un mapa",
    sub: "Cada pregunta es un nodo en un canvas. Conecta las respuestas con flechas y cada persona recorre solo el camino que le corresponde.",
    secondary: "Ver cómo funciona",
  },
  canvas: {
    aria: "Ejemplo de encuesta en el canvas: una pregunta de sí o no. Quien responde sí sigue por dos preguntas más; quien responde no salta directo a la pantalla final.",
    q1: "¿Usaste el servicio?",
    yes: "Sí",
    no: "No",
    q2: "¿Cómo fue la atención?",
    q3: "¿Qué pasó?",
    options: ["Demoras", "Trato", "Precio"],
    end: "Fin · ¡Gracias!",
    skip: "Salta las preguntas",
    legend: ["Rama según la respuesta", "Siguiente pregunta", "Salto al final"],
  },
  benefits: {
    title: "Armar todo visualmente te ahorra trabajo",
    intro:
      "Cuando cada persona necesita un camino distinto, el canvas evita las encuestas duplicadas y las reglas que nadie se atreve a tocar.",
    items: [
      {
        title: "Sin lógica complicada de entender",
        text: "No hay reglas escondidas en menús ni condiciones que descifrar. Cada camino es una línea que puedes seguir con el dedo, y cualquier persona del equipo entiende la encuesta en segundos.",
      },
      {
        title: "Una sola encuesta para todos los grupos",
        text: "Cada grupo recorre su propia rama dentro de la misma encuesta. No necesitas duplicarla por cliente, mercado o segmento, ni mantener cinco versiones al corregir una pregunta.",
      },
      {
        title: "Verificas probando, no leyendo reglas",
        text: "Prueba cada camino en la vista previa mientras armas y confirma que cada respuesta lleva a donde esperabas. Si algo no cuadra, reconectas la flecha y listo.",
      },
      {
        title: "Todos los resultados en un solo lugar",
        text: "Las respuestas de todos los grupos llegan al mismo análisis. Compara grupos, filtra y mira el recorrido sin juntar planillas de encuestas distintas.",
      },
    ],
    map: {
      aria: "Tres caminos distintos salen de una misma pregunta y se ven como líneas.",
      question: "Pregunta",
      paths: ["Camino 1", "Camino 2", "Camino 3"],
      next: "Sigue",
      end: "Fin",
    },
    groups: {
      aria: "Una sola encuesta se divide en tres grupos.",
      survey: "Una encuesta",
      names: ["Clientes", "Prospectos", "Ex clientes"],
    },
    tryPaths: [
      ["Sí", "Atención", "Motivo", "Fin"],
      ["No", "Fin"],
    ],
  },
  how: {
    title: "Tres pasos, sin menús de lógica",
    steps: [
      {
        title: "Suma preguntas como nodos",
        text: "Cada pregunta es una tarjeta que acomodas en el canvas. Hay 18 tipos, desde opción múltiple hasta ranking y matrices.",
      },
      {
        title: "Conecta cada respuesta",
        text: "Arrastra una flecha desde una respuesta hasta la pregunta que sigue. Si no conectas nada, pasa a la siguiente.",
      },
      {
        title: "Publica y mira los recorridos",
        text: "Comparte un enlace y revisa por dónde avanzó cada persona, cuántas llegaron a cada rama y dónde abandonaron.",
      },
    ],
  },
  features: {
    title: "Pensado para encuestas que no son una lista",
    intro: "Todo lo que necesitas cuando las preguntas dependen de lo que respondió la persona.",
    branches: {
      title: "Una rama por cada respuesta",
      text: "Cada opción tiene su propia salida. La persona que contesta «Mala» ve preguntas distintas a la que contesta «Buena», sin escribir una sola regla.",
      points: [
        "Ramas en opción múltiple, casillas, menús e imágenes",
        "Pregunta siguiente por defecto cuando no hay rama",
        "Vista previa en vivo mientras armas",
      ],
      question: "¿Cómo fue tu experiencia?",
      rows: [
        ["Buena", "→ ¿Qué fue lo mejor?"],
        ["Regular", "→ ¿Qué podríamos mejorar?"],
        ["Mala", "→ ¿Qué pasó? Cuéntanos."],
      ],
    },
    groups: {
      title: "Ordena las encuestas largas en grupos",
      text: "Reúne preguntas en bloques con nombre, como «Datos personales», «Perfil comercial» o «Relación con la compañía», y muévelos por el canvas como una sola pieza.",
      points: [
        "Selecciona varias preguntas y pulsa Agrupar",
        "Arrastra el encabezado y se mueve todo el grupo",
        "Suma una pregunta arrastrándola sobre un grupo; con Ctrl la sacas",
        "Los grupos son para ti: quien responde no los ve",
      ],
      aria: "Tres grupos con nombre, con distinta cantidad de preguntas, conectados entre sí.",
      names: ["Datos personales", "Perfil comercial", "Relación con la compañía"],
      nodes: [["Nombre", "Edad"], ["Rubro", "Cargo", "Región"], ["Antigüedad", "Contacto"]],
    },
    filter: {
      title: "Filtra y cierra en el momento justo",
      text: "Termina la encuesta o descalifica según una respuesta, y limita cuántas personas pueden elegir cada opción.",
      points: [
        "Final o descalificación por respuesta, con mensaje o redirección",
        "Cupo por opción: se cierra sola al llenarse",
        "Variables personalizadas capturadas desde el enlace",
      ],
      question: "¿Qué edad tienes?",
      rows: [
        ["Menos de 18", "Descalificar"],
        ["18 a 35", "Cupo 40 / 50"],
        ["Más de 35", "Continuar"],
      ],
    },
    route: {
      title: "Mira el recorrido, no solo los totales",
      text: "Además de los resultados por pregunta, ves por dónde avanzó la gente a través del mismo mapa con el que armaste la encuesta.",
      points: [
        "Resumen por pregunta con gráficos y tablas",
        "Respuestas individuales, filtros, comparación y vistas guardadas",
        "Exportación a CSV",
      ],
      bars: ["Empezaron", "Respondieron «Mala»", "Dejaron su contacto"],
    },
    links: {
      title: "Un enlace para cada canal",
      text: "Crea varios enlaces de la misma encuesta y compara de dónde vienen las respuestas.",
      points: [
        "Código QR, correo, redes e incrustado en tu sitio",
        "Contraseña, límite de respuestas y fecha de cierre por enlace",
        "Avisos cuando entran respuestas o se llena un límite",
      ],
      rows: [
        ["Enlace web 1", "48 respuestas"],
        ["Boletín", "Límite 200"],
        ["Local de Palermo (QR)", "Cierra el 30/11"],
      ],
    },
  },
  types: {
    title: "18 tipos de pregunta, todos como nodos",
    intro: "Combínalos en el canvas y personaliza cómo se ve la encuesta con tu logo, colores y tipografías.",
    groups: ["Selección", "Valoración", "Cuadro de texto", "Formularios"],
    labels: {
      single_choice: "Opción múltiple",
      multi_choice: "Casillas de verificación",
      dropdown: "Menú desplegable",
      dropdown_matrix: "Matriz de menús desplegables",
      image_choice: "Elección de imagen",
      rating: "Valoración con estrellas",
      slider: "Control deslizante",
      ranking: "Ranking",
      rating_matrix: "Matriz/escala de valoración",
      best_worst: "Escala mejor/peor",
      text: "Cuadro para comentarios",
      short_text: "Cuadro de texto simple",
      multiple_text: "Cuadros de texto múltiples",
      name: "Nombre",
      email: "Dirección de correo electrónico",
      phone: "Teléfono",
      address: "Dirección",
      datetime: "Fecha/Hora",
    } as Record<string, string>,
  },
  cases: {
    title: "Donde un canvas se nota",
    items: [
      {
        title: "Filtros para investigación",
        text: "Haz primero las preguntas de perfil y deja fuera, desde la primera pantalla, a quienes no cumplen. Cierra cada segmento al llegar a su cupo.",
      },
      {
        title: "Diagnósticos con puntaje",
        text: "Arma un test donde cada respuesta suma puntos y las preguntas siguientes dependen de lo que contesta la persona.",
      },
      {
        title: "NPS con seguimiento",
        text: "Pregunta cuánto recomendarían y, según la nota, pide el motivo, ofrece contacto o agradece y cierra.",
      },
    ],
  },
  teaser: {
    title: "Empieza gratis",
    intro: "Prueba el canvas sin tarjeta. Pasa a un plan de pago cuando necesites más respuestas o más enlaces.",
    button: "Ver planes y precios",
    free: "Gratis",
    perMonth: "/mes",
  },
  faq: {
    title: "Preguntas frecuentes",
    items: [
      {
        q: "¿Tengo que saber programar o escribir reglas?",
        a: "No. La lógica se arma conectando nodos: eliges una respuesta y la unes con la pregunta que sigue.",
      },
      {
        q: "¿Cuántas ramas puedo armar?",
        a: "Todas las que necesites. Cada opción de una pregunta de selección puede llevar a una pregunta distinta o terminar la encuesta.",
      },
      {
        q: "¿Puedo organizar una encuesta con muchas preguntas?",
        a: "Sí. Agrupa preguntas en bloques con nombre, como «Datos personales» o «Perfil comercial», y muévelas juntas por el canvas. Los grupos son solo para ordenar tu trabajo: quien responde no los ve.",
      },
      {
        q: "¿Cómo la comparto?",
        a: "Con un enlace, un código QR o incrustada en tu sitio. Puedes crear varios enlaces de la misma encuesta, cada uno con su contraseña, límite y fecha de cierre.",
      },
      {
        q: "¿Puedo sacar los resultados?",
        a: "Sí, desde el análisis exportas las respuestas a CSV. La exportación a Excel y PDF está en camino.",
      },
      {
        q: "¿Qué incluye el plan gratis?",
        a: "3 encuestas con hasta 10 preguntas y 100 respuestas al mes, con el canvas completo. Las encuestas muestran un aviso de Visualquery.",
      },
    ],
  },
  finalCta: { title: "Arma tu primera encuesta como un mapa" },
  footer: { plans: "Planes", login: "Iniciar sesión", signup: "Crear cuenta", nav: "Pie de página" },
  pricing: {
    metaTitle: "Planes y precios · Visualquery",
    metaDescription: "Elige el plan de Visualquery que se ajusta a tu volumen de encuestas.",
    title: "Planes y precios",
    intro: "Empieza gratis y pasa a un plan de pago cuando necesites más respuestas, más enlaces o segmentación avanzada.",
    backToSurvey: "Volver a la encuesta",
    extraTitle: "Respuestas adicionales",
    extraText:
      "Si superas el límite mensual de tu plan, cada respuesta extra cuesta US${price}. Las encuestas siguen funcionando: no se cortan a mitad del mes.",
    soonTitle: "Próximamente",
    soon: [
      "Exportar a Excel y PDF",
      "Invitaciones por correo",
      "Encuestas en varios idiomas",
      "Equipos y permisos",
      "Integraciones y API",
      "Análisis de texto con IA",
    ],
    note: "Los pagos todavía no están habilitados: por ahora todas las cuentas usan Visualquery sin cargo.",
    monthly: "Mensual",
    yearly: "Anual (−{pct}%)",
    popular: "Más elegido",
    billedYearly: "Facturado US${amount} por año",
    perMonth: "/mes",
    custom: "A medida",
    free: "Gratis",
    startFree: "Empezar gratis",
    contact: "Contáctanos",
    choose: "Elegir plan",
    current: "Tu plan actual",
    soonShort: "Próximamente",
    plans: {
      free: {
        name: "Gratis",
        tagline: "Para probar la herramienta y armar encuestas sencillas.",
        limits: ["3 encuestas", "10 preguntas por encuesta", "100 respuestas por mes", "1 enlace por encuesta"],
        features: [
          "Canvas visual con ramificación por respuesta",
          "Tipos de pregunta básicos",
          "Resumen por pregunta y respuestas individuales",
          "Exportar a CSV",
          "Aviso «Hecho con Visualquery» en la encuesta",
        ],
      },
      pro: {
        name: "Pro",
        tagline: "Para quien encuesta seguido y quiere una imagen propia.",
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
      business: {
        name: "Business",
        tagline: "Para estudios con segmentación y control de muestra.",
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
      enterprise: {
        name: "Enterprise",
        tagline: "Volumen alto, necesidades a medida.",
        limits: ["Respuestas a medida", "Soporte prioritario"],
        features: ["Todo lo de Business", "Acuerdo y facturación a medida", "Implementaciones y migración asistida"],
      },
    } as Record<PlanId, PlanText>,
  },
};

export type Content = typeof es;

const en: Content = {
  nav: {
    how: "How it works",
    features: "Features",
    plans: "Pricing",
    faq: "FAQ",
    login: "Log in",
    start: "Start free",
    mySurveys: "Go to my surveys",
    mainNav: "Main",
  },
  meta: {
    homeTitle: "Visualquery · Surveys built like a map",
    homeDescription:
      "Build surveys with conditional logic by connecting questions as nodes on a canvas. Each person follows only the path that applies to them.",
  },
  hero: {
    title: "Build your survey like a map",
    sub: "Every question is a node on a canvas. Connect answers with arrows and each person follows only the path that applies to them.",
    secondary: "See how it works",
  },
  canvas: {
    aria: "Example survey on the canvas: a yes or no question. Whoever answers yes continues through two more questions; whoever answers no jumps straight to the final screen.",
    q1: "Did you use the service?",
    yes: "Yes",
    no: "No",
    q2: "How was the service?",
    q3: "What happened?",
    options: ["Delays", "Staff", "Price"],
    end: "End · Thank you!",
    skip: "Skips the questions",
    legend: ["Branch by answer", "Next question", "Jump to the end"],
  },
  benefits: {
    title: "Building everything visually saves you work",
    intro:
      "When each person needs a different path, the canvas spares you duplicate surveys and rules nobody dares to touch.",
    items: [
      {
        title: "No complicated logic to figure out",
        text: "No rules hidden in menus and no conditions to decipher. Every path is a line you can follow with your finger, and anyone on the team understands the survey in seconds.",
      },
      {
        title: "One survey for every group",
        text: "Each group follows its own branch inside the same survey. You don't need to duplicate it per customer, market or segment, or keep five versions in sync when you fix one question.",
      },
      {
        title: "You verify by trying it, not by reading rules",
        text: "Try every path in the preview while you build and confirm each answer leads where you expected. If something is off, reconnect the arrow and you're done.",
      },
      {
        title: "All results in one place",
        text: "Answers from every group land in the same analysis. Compare groups, filter and follow the journey without stitching together spreadsheets from different surveys.",
      },
    ],
    map: {
      aria: "Three different paths leave the same question and show up as lines.",
      question: "Question",
      paths: ["Path 1", "Path 2", "Path 3"],
      next: "Next",
      end: "End",
    },
    groups: {
      aria: "A single survey splits into three groups.",
      survey: "One survey",
      names: ["Customers", "Prospects", "Past customers"],
    },
    tryPaths: [
      ["Yes", "Service", "Reason", "End"],
      ["No", "End"],
    ],
  },
  how: {
    title: "Three steps, no logic menus",
    steps: [
      {
        title: "Add questions as nodes",
        text: "Each question is a card you place on the canvas. There are 18 types, from multiple choice to ranking and matrices.",
      },
      {
        title: "Connect each answer",
        text: "Drag an arrow from an answer to the question that follows. If you connect nothing, it moves on to the next one.",
      },
      {
        title: "Publish and watch the journeys",
        text: "Share a link and see where each person went, how many reached each branch and where they dropped off.",
      },
    ],
  },
  features: {
    title: "Made for surveys that aren't a list",
    intro: "Everything you need when questions depend on what the person answered.",
    branches: {
      title: "One branch per answer",
      text: "Every option has its own exit. Someone who answers “Bad” sees different questions from someone who answers “Good”, without writing a single rule.",
      points: [
        "Branches on multiple choice, checkboxes, dropdowns and images",
        "Next question by default when there is no branch",
        "Live preview while you build",
      ],
      question: "How was your experience?",
      rows: [
        ["Good", "→ What did you like most?"],
        ["Average", "→ What could we improve?"],
        ["Bad", "→ What happened? Tell us."],
      ],
    },
    groups: {
      title: "Organize long surveys into groups",
      text: "Gather questions into named blocks, like “Personal details”, “Business profile” or “Relationship with the company”, and move them across the canvas as one piece.",
      points: [
        "Select several questions and press Group",
        "Drag the header and the whole group moves",
        "Add a question by dragging it onto a group; hold Ctrl to take it out",
        "Groups are for you: respondents don't see them",
      ],
      aria: "Three named groups with different numbers of questions, connected to each other.",
      names: ["Personal details", "Business profile", "Relationship with the company"],
      nodes: [["Name", "Age"], ["Industry", "Role", "Region"], ["Tenure", "Contact"]],
    },
    filter: {
      title: "Filter and close at the right moment",
      text: "End the survey or disqualify based on an answer, and cap how many people can pick each option.",
      points: [
        "Ending or disqualification by answer, with a message or redirect",
        "Quota per option: it closes by itself when full",
        "Custom variables captured from the link",
      ],
      question: "How old are you?",
      rows: [
        ["Under 18", "Disqualify"],
        ["18 to 35", "Quota 40 / 50"],
        ["Over 35", "Continue"],
      ],
    },
    route: {
      title: "See the journey, not just the totals",
      text: "Beyond per-question results, you see where people went through the same map you built the survey with.",
      points: [
        "Per-question summary with charts and tables",
        "Individual responses, filters, comparison and saved views",
        "CSV export",
      ],
      bars: ["Started", "Answered “Bad”", "Left their contact"],
    },
    links: {
      title: "A link for every channel",
      text: "Create several links for the same survey and compare where responses come from.",
      points: [
        "QR code, email, social and embedded in your site",
        "Password, response limit and closing date per link",
        "Alerts when responses arrive or a limit is reached",
      ],
      rows: [
        ["Web link 1", "48 responses"],
        ["Newsletter", "Limit 200"],
        ["Palermo store (QR)", "Closes Nov 30"],
      ],
    },
  },
  types: {
    title: "18 question types, all as nodes",
    intro: "Combine them on the canvas and customize how the survey looks with your logo, colors and fonts.",
    groups: ["Selection", "Rating", "Text box", "Forms"],
    labels: {
      single_choice: "Multiple choice",
      multi_choice: "Checkboxes",
      dropdown: "Dropdown",
      dropdown_matrix: "Dropdown matrix",
      image_choice: "Image choice",
      rating: "Star rating",
      slider: "Slider",
      ranking: "Ranking",
      rating_matrix: "Rating matrix/scale",
      best_worst: "Best/worst scale",
      text: "Comment box",
      short_text: "Single-line text",
      multiple_text: "Multiple text boxes",
      name: "Name",
      email: "Email address",
      phone: "Phone",
      address: "Address",
      datetime: "Date/Time",
    },
  },
  cases: {
    title: "Where a canvas shows its value",
    items: [
      {
        title: "Screeners for research",
        text: "Ask the profile questions first and screen out, from the very first screen, anyone who doesn't qualify. Close each segment when it reaches its quota.",
      },
      {
        title: "Scored diagnostics",
        text: "Build a quiz where each answer adds points and the following questions depend on what the person answers.",
      },
      {
        title: "NPS with follow-up",
        text: "Ask how likely they are to recommend you and, depending on the score, ask why, offer contact or say thanks and finish.",
      },
    ],
  },
  teaser: {
    title: "Start free",
    intro: "Try the canvas with no card. Move to a paid plan when you need more responses or more links.",
    button: "See plans and pricing",
    free: "Free",
    perMonth: "/mo",
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        q: "Do I need to code or write rules?",
        a: "No. Logic is built by connecting nodes: pick an answer and link it to the question that follows.",
      },
      {
        q: "How many branches can I build?",
        a: "As many as you need. Each option of a selection question can lead to a different question or end the survey.",
      },
      {
        q: "Can I organize a survey with lots of questions?",
        a: "Yes. Group questions into named blocks, like “Personal details” or “Business profile”, and move them together across the canvas. Groups are only for organizing your work: respondents don't see them.",
      },
      {
        q: "How do I share it?",
        a: "With a link, a QR code or embedded in your site. You can create several links for the same survey, each with its own password, limit and closing date.",
      },
      {
        q: "Can I export the results?",
        a: "Yes, from the analysis you export responses to CSV. Excel and PDF export is on the way.",
      },
      {
        q: "What does the free plan include?",
        a: "3 surveys with up to 10 questions and 100 responses per month, with the full canvas. Surveys show a Visualquery notice.",
      },
    ],
  },
  finalCta: { title: "Build your first survey like a map" },
  footer: { plans: "Pricing", login: "Log in", signup: "Sign up", nav: "Footer" },
  pricing: {
    metaTitle: "Plans and pricing · Visualquery",
    metaDescription: "Choose the Visualquery plan that fits your survey volume.",
    title: "Plans and pricing",
    intro: "Start free and move to a paid plan when you need more responses, more links or advanced segmentation.",
    backToSurvey: "Back to the survey",
    extraTitle: "Additional responses",
    extraText:
      "If you go over your plan's monthly limit, each extra response costs US${price}. Your surveys keep working: they don't stop mid-month.",
    soonTitle: "Coming soon",
    soon: [
      "Export to Excel and PDF",
      "Email invitations",
      "Multi-language surveys",
      "Teams and permissions",
      "Integrations and API",
      "AI text analysis",
    ],
    note: "Payments are not enabled yet: for now every account uses Visualquery at no cost.",
    monthly: "Monthly",
    yearly: "Yearly (−{pct}%)",
    popular: "Most popular",
    billedYearly: "Billed US${amount} per year",
    perMonth: "/mo",
    custom: "Custom",
    free: "Free",
    startFree: "Start free",
    contact: "Contact us",
    choose: "Choose plan",
    current: "Your current plan",
    soonShort: "Coming soon",
    plans: {
      free: {
        name: "Free",
        tagline: "To try the tool and build simple surveys.",
        limits: ["3 surveys", "10 questions per survey", "100 responses per month", "1 link per survey"],
        features: [
          "Visual canvas with branching by answer",
          "Basic question types",
          "Per-question summary and individual responses",
          "CSV export",
          "“Made with Visualquery” notice on the survey",
        ],
      },
      pro: {
        name: "Pro",
        tagline: "For people who survey often and want their own look.",
        limits: ["Unlimited surveys and questions", "2,000 responses per month", "Up to 5 links per survey"],
        features: [
          "All question types (ranking, matrices, best/worst, image…)",
          "Full design: logo, colors, fonts, backgrounds and welcome/closing screens",
          "No Visualquery notice",
          "Ending and disqualification by answer, with redirect",
          "Per link: password, response limit and closing date",
          "Social preview, QR code and embedding in your site",
          "Notification center",
          "Filters, compare, show and saved views",
          "Delete responses",
        ],
      },
      business: {
        name: "Business",
        tagline: "For studies that need segmentation and sample control.",
        limits: ["20,000 responses per month", "Unlimited links per survey"],
        features: [
          "Everything in Pro",
          "Quotas per option (an option closes when full)",
          "Custom variables captured from the link",
          "Filters by variable and by response time",
          "Response flow (where each respondent went)",
          "Test mode with scoring",
        ],
      },
      enterprise: {
        name: "Enterprise",
        tagline: "High volume, tailored needs.",
        limits: ["Custom response volume", "Priority support"],
        features: ["Everything in Business", "Custom agreement and invoicing", "Assisted implementation and migration"],
      },
    },
  },
};

export function getContent(lang: Lang): Content {
  return lang === "en" ? en : es;
}

/** Fills «{name}» placeholders in a content template. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
