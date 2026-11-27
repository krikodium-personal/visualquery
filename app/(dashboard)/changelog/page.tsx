const ENTRIES = [
  {
    date: "Noviembre 2026",
    title: "Análisis más completo",
    items: [
      "Resúmenes para ranking, matrices y mejor/peor",
      "Filtros por variable personalizada y por tiempo de respuesta",
      "Borrar respuestas individuales o todas las filtradas",
      "Parámetros y vistas guardadas en una columna fija",
    ],
  },
  {
    date: "Noviembre 2026",
    title: "Publicación con varios recopiladores",
    items: [
      "Varios enlaces por encuesta, cada uno con sus límites, contraseña y cierre",
      "Vista previa para redes, código QR e incrustado",
      "Centro de notificaciones",
    ],
  },
  {
    date: "Noviembre 2026",
    title: "Lógica y cupos",
    items: [
      "Variables personalizadas capturadas desde el enlace",
      "Finalizar o descalificar según la respuesta",
      "Cupo por opción",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Novedades</h1>
      {ENTRIES.map((entry) => (
        <section key={entry.title} className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground">{entry.date}</p>
          <h2 className="mt-1 text-lg font-semibold">{entry.title}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {entry.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
