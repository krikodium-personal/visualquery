"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STEPS = [
  "Analizando tu descripción…",
  "Diseñando las preguntas…",
  "Conectando las ramas según las respuestas…",
  "Ordenando el canvas…",
  "Ya casi está…",
];
const STEP_SECONDS = 12;

const EXAMPLE =
  "Encuesta de satisfacción para clientes de un gimnasio. Si la persona no volvería a inscribirse, preguntar el motivo; si recomendaría el gimnasio, pedir un comentario.";

export function AiSurveyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"auto" | "es" | "en">("auto");
  const [questionCount, setQuestionCount] = useState(10);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  async function generate() {
    setError(null);
    setSeconds(0);
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/ai/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, language, questionCount }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo crear la encuesta. Inténtalo de nuevo.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const text of lines) {
          if (!text.trim()) continue;
          const event = JSON.parse(text) as { type: string; surveyId?: string; message?: string };
          if (event.type === "done" && event.surveyId) {
            finished = true;
            toast.success("Encuesta creada. Revísala y ajústala antes de publicar.");
            setOpen(false);
            router.push(`/surveys/${event.surveyId}/questions?align=1`);
          } else if (event.type === "error") {
            throw new Error(event.message ?? "No se pudo crear la encuesta.");
          }
        }
      }
      if (!finished) throw new Error("La conexión se cortó antes de terminar. Inténtalo de nuevo.");
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "No se pudo crear la encuesta.");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function close() {
    abortRef.current?.abort();
    setRunning(false);
    setOpen(false);
  }

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(seconds / STEP_SECONDS))];

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : !running && close())}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Sparkles className="size-4" />
            Crear con IA
          </Button>
        }
      />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear una encuesta con IA</DialogTitle>
          <DialogDescription>
            Cuéntanos qué quieres averiguar y a quién va dirigida. Armamos un borrador con preguntas y ramas en el
            canvas para que lo ajustes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-description">Descripción</Label>
            <Textarea
              id="ai-description"
              rows={5}
              value={description}
              maxLength={2500}
              disabled={running}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={EXAMPLE}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Cuanto más contexto des (objetivo, público, qué debe pasar según cada respuesta), mejor el resultado.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-language">Idioma</Label>
              <select
                id="ai-language"
                value={language}
                disabled={running}
                onChange={(e) => setLanguage(e.target.value as "auto" | "es" | "en")}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="auto">El de la descripción</option>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-count">Cantidad de preguntas</Label>
              <select
                id="ai-count"
                value={questionCount}
                disabled={running}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                {[5, 8, 10, 12, 15, 20, 25].map((n) => (
                  <option key={n} value={n}>
                    Unas {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {running ? (
            <div role="status" className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              {step} <span className="text-muted-foreground">({seconds} s) Puede tardar hasta un par de minutos.</span>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {running ? "Cancelar" : "Cerrar"}
          </Button>
          <Button onClick={generate} disabled={running || description.trim().length < 15}>
            {running ? "Generando..." : "Generar encuesta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
