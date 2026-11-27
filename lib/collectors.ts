export type CollectorGate = {
  status: string;
  cutoffAt: Date | null;
  responseLimit: number | null;
};

/** Why a collector can't take responses right now, or null when it can. */
export function collectorClosedReason(collector: CollectorGate, responseCount: number): string | null {
  if (collector.status !== "open") return "Este recopilador está cerrado y ya no acepta respuestas.";
  if (collector.cutoffAt && collector.cutoffAt.getTime() <= Date.now()) {
    return "Esta encuesta ya alcanzó su fecha de cierre.";
  }
  if (collector.responseLimit !== null && responseCount >= collector.responseLimit) {
    return "Esta encuesta alcanzó el límite de respuestas.";
  }
  return null;
}
