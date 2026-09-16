export const QUESTION_TYPE_VALUES = [
  "single_choice",
  "multi_choice",
  "dropdown",
  "dropdown_matrix",
  "image_choice",
  "rating",
  "slider",
  "ranking",
  "rating_matrix",
  "best_worst",
  "text",
  "short_text",
  "multiple_text",
  "name",
  "email",
  "phone",
  "address",
  "datetime",
] as const;

export type QuestionType = (typeof QUESTION_TYPE_VALUES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
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
};

export const QUESTION_TYPE_INSTRUCTIONS: Record<QuestionType, string> = {
  single_choice: "Selecciona una opción",
  multi_choice: "Selecciona todas las opciones que correspondan",
  dropdown: "Selecciona una opción de la lista",
  dropdown_matrix: "Selecciona una opción para cada fila",
  image_choice: "Selecciona una imagen",
  rating: "Selecciona una valoración",
  slider: "Desliza el control hasta el valor que quieras",
  ranking: "Arrastra las opciones en la posición correcta",
  rating_matrix: "Selecciona una valoración para cada elemento",
  best_worst: "Selecciona la mejor y la peor opción",
  text: "Escribe tu respuesta",
  short_text: "Escribe tu respuesta",
  multiple_text: "Completa cada campo",
  name: "Ingresa tu nombre y apellido",
  email: "Ingresa tu dirección de correo electrónico",
  phone: "Ingresa tu número de teléfono",
  address: "Completa los datos de tu dirección",
  datetime: "Selecciona una fecha y hora",
};

export const QUESTION_TYPE_GROUPS = [
  {
    label: "Selección",
    types: ["single_choice", "multi_choice", "dropdown", "dropdown_matrix", "image_choice"],
  },
  {
    label: "Valoración",
    types: ["rating", "slider", "ranking", "rating_matrix", "best_worst"],
  },
  { label: "Cuadro de texto", types: ["text", "short_text", "multiple_text"] },
  { label: "Formularios", types: ["name", "email", "phone", "address", "datetime"] },
] satisfies { label: string; types: QuestionType[] }[];

export const OPTION_BASED_TYPES: QuestionType[] = [
  "single_choice",
  "multi_choice",
  "dropdown",
  "image_choice",
  "ranking",
  "best_worst",
  "multiple_text",
  "rating_matrix",
];

export const BRANCHABLE_TYPES: QuestionType[] = [
  "single_choice",
  "multi_choice",
  "dropdown",
  "image_choice",
];
